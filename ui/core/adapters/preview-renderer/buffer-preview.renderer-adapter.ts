import type { GrammarState, ThemedToken } from "shiki";
import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewManagerConfig } from "../../../../shared/exchange/extension-config";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { toInnerHTML } from "../../../utils/html";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { OptionListManager } from "../../common/option-list-manager";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { SyntaxHighlighter } from "../../registry/preview-adapter.registry";
import { HighlighterManager } from "../../render/highlighter-manager";

const CHUNK_SIZE = 30;
const SCROLL_THRESHOLD = 300;
const MAX_LINE_LENGTH = 120;
const TRUNCATION_SUFFIX = "...";
const INITIAL_CHUNKS_TO_LOAD = 1;
const MAX_CACHE_SIZE = 5000;

function truncateLine(line: string): string {
  if (line.length <= MAX_LINE_LENGTH) return line;
  return line.substring(0, MAX_LINE_LENGTH) + TRUNCATION_SUFFIX;
}

class LazyLineParser {
  private lineCache = new Map<number, string>();
  private lineOffsets: number[] = [];
  private totalLines = 0;

  constructor(private text: string) {
    this.indexLines();
  }

  private indexLines(): void {
    this.lineOffsets = [0];
    let pos = 0;

    while ((pos = this.text.indexOf("\n", pos)) !== -1) {
      pos++;
      this.lineOffsets.push(pos);
    }

    if (this.lineOffsets[this.lineOffsets.length - 1] !== this.text.length) {
      this.lineOffsets.push(this.text.length);
    }

    this.totalLines = this.lineOffsets.length - 1;
  }

  getTotalLines(): number {
    return this.totalLines;
  }

  getLines(start: number, end: number): string[] {
    const lines: string[] = [];
    const actualEnd = Math.min(end, this.totalLines);

    for (let i = start; i < actualEnd; i++) {
      let line = this.lineCache.get(i);

      if (line === undefined) {
        const startPos = this.lineOffsets[i];
        const endPos = this.lineOffsets[i + 1];
        line = truncateLine(this.text.substring(startPos, endPos - (this.text[endPos - 1] === "\n" ? 1 : 0)));

        if (this.lineCache.size >= MAX_CACHE_SIZE) {
          const firstKey = this.lineCache.keys().next().value;
          this.lineCache.delete(firstKey);
        }
        this.lineCache.set(i, line);
      }

      lines.push(line);
    }

    return lines;
  }

  clearCache(): void {
    this.lineCache.clear();
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function makeHtmlFromTokens(
  lineTokens: ThemedToken[][],
  bg: string,
  fg: string,
  themeName: string,
  startLineIndex: number,
  highlightLineNum?: number,
  showLineNumbers: boolean = true,
): string {
  const lineHtmlParts = lineTokens.map((tokens, index) => {
    const currentLineNum = startLineIndex + index + 1;
    const isHighlighted = highlightLineNum !== undefined && currentLineNum - 1 === highlightLineNum;

    const lineClass = isHighlighted ? 'class="line highlighted"' : 'class="line"';
    const dataLine = showLineNumbers ? ` data-line="${currentLineNum}"` : "";

    const tokenSpans = tokens
      .map((token) => {
        if (!token.color && !token.bgColor && !token.fontStyle) {
          return `<span>${escapeHtml(token.content)}</span>`;
        }

        let style = "";
        if (token.color) style += `color:${token.color};`;
        if (token.bgColor) style += `background-color:${token.bgColor};`;
        if (token.fontStyle) {
          if (token.fontStyle & 1) style += "font-style:italic;";
          if (token.fontStyle & 2) style += "font-weight:bold;";
          if (token.fontStyle & 4) style += "text-decoration:underline;";
        }

        return `<span style="${style}">${escapeHtml(token.content)}</span>`;
      })
      .join("");

    return `<span ${lineClass}${dataLine}>${tokenSpans}</span>`;
  });

  const codeContent = lineHtmlParts.join("\n");

  return (
    `<pre class="shiki ${escapeHtml(themeName)}" style="background-color:${bg};color:${fg}">` +
    `<code>${codeContent}</code>` +
    `</pre>`
  );
}

@PreviewRendererAdapter({
  adapter: "preview.buffer",
})
export class BufferPreviewRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;

  private loadedChunks = new Set<number>();
  private chunkHtmlCache = new Map<number, string>();
  private minLoadedChunk = Infinity;
  private maxLoadedChunk = -Infinity;
  private scrollHandler?: () => void;
  private currentPreviewElement?: HTMLElement;
  private isRendering = false;
  private lineParser?: LazyLineParser;
  private abortController?: AbortController;
  private grammarStates = new Map<number, GrammarState>();

  constructor(private highlighter: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: TextPreviewData): Promise<void> {
    let { content, language, metadata } = data;

    if (!this.highlighter) {
      previewElement.innerHTML = `<pre style="padding:1rem;">${toInnerHTML(content)}</pre>`;
      return;
    }

    this.cleanup();

    previewElement.innerHTML = "";
    previewElement.scrollTop = 0;
    this.loadedChunks.clear();
    this.chunkHtmlCache.clear();
    this.grammarStates.clear();
    this.minLoadedChunk = Infinity;
    this.maxLoadedChunk = -Infinity;
    this.currentPreviewElement = previewElement;
    this.abortController = new AbortController();

    const THRESHOLD = 5000;
    let totalLines: number;

    if (content.length > THRESHOLD) {
      this.lineParser = new LazyLineParser(content);
      totalLines = this.lineParser.getTotalLines();
    } else {
      this.lineParser = undefined;
      totalLines = content.split("\n").length;
    }

    const highlightLine = metadata?.highlightLine ?? 0;
    const initialChunk = Math.floor(highlightLine / CHUNK_SIZE);

    let finalLanguageId = "plaintext";
    if (language) {
      const langLoadResult = await HighlighterManager.loadLanguageIfNeeded(language);
      if (langLoadResult.ok) {
        finalLanguageId = langLoadResult.value.grammar.name;
      }
    }

    let finalThemeName = data.theme;

    if (data.theme) {
      const themeResult = await HighlighterManager.loadThemeIfNeeded(data.theme);
      if (themeResult.ok) {
        finalThemeName = themeResult.value.jsonData?.name || themeResult.value.name;
      } else {
        finalThemeName = "none";
      }
    }

    let themeBg = "#1e1e1e";
    let themeFg = "#d4d4d4";

    try {
      const resolvedTheme = this.highlighter.getTheme(finalThemeName);
      if (resolvedTheme) {
        themeBg = resolvedTheme.bg ?? themeBg;
        themeFg = resolvedTheme.fg ?? themeFg;
      }
    } catch {}

    const renderChunk = async (chunkIndex: number, position: "append" | "prepend" = "append"): Promise<void> => {
      if (OptionListManager.instance.isEmpty()) {
        this.abortController.abort();
        return;
      }

      if (this.abortController?.signal.aborted) return;
      if (this.loadedChunks.has(chunkIndex)) return;
      if (chunkIndex < 0 || chunkIndex * CHUNK_SIZE >= totalLines) return;

      this.loadedChunks.add(chunkIndex);
      this.minLoadedChunk = Math.min(this.minLoadedChunk, chunkIndex);
      this.maxLoadedChunk = Math.max(this.maxLoadedChunk, chunkIndex);

      if (this.chunkHtmlCache.has(chunkIndex)) {
        this.insertChunkIntoDOM(previewElement, this.chunkHtmlCache.get(chunkIndex)!, chunkIndex, position);
        return;
      }

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalLines);

      let chunkText: string;
      if (this.lineParser) {
        chunkText = this.lineParser.getLines(start, end).join("\n");
      } else {
        const lines = content.split("\n");
        chunkText = lines.slice(start, end).map(truncateLine).join("\n");
      }

      const prevGrammarState = this.grammarStates.get(chunkIndex - 1);

      let lineTokens: ThemedToken[][];
      let nextGrammarState: GrammarState | undefined;

      try {
        const result = this.highlighter.codeToTokens(chunkText, {
          lang: finalLanguageId,
          theme: finalThemeName,
          ...(prevGrammarState ? { grammarState: prevGrammarState } : {}),
        });

        lineTokens = result.tokens as ThemedToken[][];
        nextGrammarState = result.grammarState as GrammarState | undefined;
      } catch (err) {
        const html = this.highlighter.codeToHtml(chunkText, {
          lang: finalLanguageId,
          theme: finalThemeName,
        });

        this.chunkHtmlCache.set(chunkIndex, html);
        this.insertChunkIntoDOM(previewElement, html, chunkIndex, position);
        return;
      }

      if (nextGrammarState) {
        this.grammarStates.set(chunkIndex, nextGrammarState);
      }

      const showLineNumbers = (__PREVIEW_CFG__ as PreviewManagerConfig).showLineNumbers;

      const html = makeHtmlFromTokens(
        lineTokens,
        themeBg,
        themeFg,
        finalThemeName,
        start,
        metadata?.highlightLine,
        showLineNumbers,
      );

      this.chunkHtmlCache.set(chunkIndex, html);
      this.insertChunkIntoDOM(previewElement, html, chunkIndex, position);
    };

    await renderChunk(initialChunk);

    const adjacentPromises: Promise<void>[] = [];
    for (let i = 1; i <= INITIAL_CHUNKS_TO_LOAD; i++) {
      adjacentPromises.push(renderChunk(initialChunk + i, "append"));
      adjacentPromises.push(renderChunk(initialChunk - i, "prepend"));
    }

    Promise.all(adjacentPromises).then(() => {
      if (this.abortController?.signal.aborted) return;

      if (metadata?.highlightLine !== undefined) {
        const highlightedLine = previewElement.querySelector(".line.highlighted");
        highlightedLine?.scrollIntoView({ block: "center", behavior: "instant" });
      }
    });

    let ticking = false;
    this.scrollHandler = () => {
      if (ticking || this.isRendering || this.abortController?.signal.aborted) return;

      ticking = true;
      requestAnimationFrame(async () => {
        const { scrollTop, scrollHeight, clientHeight } = previewElement;
        this.isRendering = true;

        try {
          const atTheBottom = scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD;
          if (atTheBottom) {
            await renderChunk(this.maxLoadedChunk + 1, "append");
          }

          const atTheTop = scrollTop <= SCROLL_THRESHOLD;
          if (atTheTop) {
            await renderChunk(this.minLoadedChunk - 1, "prepend");
          }
        } finally {
          this.isRendering = false;
          ticking = false;
        }
      });
    };

    previewElement.addEventListener("scroll", this.scrollHandler, { passive: true });
  }

  private insertChunkIntoDOM(
    previewElement: HTMLElement,
    htmlContent: string,
    chunkIndex: number,
    position: "append" | "prepend",
  ): void {
    const chunkContainer = document.createElement("div");
    chunkContainer.innerHTML = htmlContent;
    chunkContainer.dataset.chunkIndex = String(chunkIndex);

    if (position === "prepend") {
      const oldScrollTop = previewElement.scrollTop;
      const oldScrollHeight = previewElement.scrollHeight;

      previewElement.prepend(chunkContainer);

      const newScrollHeight = previewElement.scrollHeight;
      previewElement.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
    } else {
      previewElement.appendChild(chunkContainer);
    }
  }

  setHighlighter(highlighter: SyntaxHighlighter): void {
    this.highlighter = highlighter;
  }

  cleanup(): void {
    this.abortController?.abort();
    this.abortController = undefined;

    if (this.scrollHandler && this.currentPreviewElement) {
      this.currentPreviewElement.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = undefined;
    }

    this.currentPreviewElement = undefined;
    this.isRendering = false;
    this.lineParser?.clearCache();
    this.lineParser = undefined;
    this.grammarStates.clear();
    this.chunkHtmlCache.clear();
  }
}
