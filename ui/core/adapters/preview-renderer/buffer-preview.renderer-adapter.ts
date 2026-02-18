import type { GrammarState, ThemedToken } from "shiki";
import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewManagerConfig } from "../../../../shared/exchange/extension-config";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { toInnerHTML } from "../../../utils/html";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { OptionListManager } from "../../common/option-list-manager";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { PreviewRendererAdapterRegistry, SyntaxHighlighter } from "../../registry/preview-adapter.registry";
import { HighlighterManager } from "../../render/highlighter-manager";

const CHUNK_SIZE = 100;
const SCROLL_THRESHOLD = 300;
const INITIAL_CHUNKS_TO_LOAD = 1;
const MAX_CACHE_SIZE = 5000;

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
        line = this.text.substring(startPos, endPos - (this.text[endPos - 1] === "\n" ? 1 : 0));

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

/**
 * Converts a ThemedToken[][] (one array per line) into an HTML string that
 * matches the structure Shiki's codeToHtml() would produce, i.e.:
 */
function makeHtmlFromTokens(lineTokens: ThemedToken[][], bg: string, fg: string, themeName: string): string {
  const lineHtmlParts = lineTokens.map((tokens) => {
    const tokenSpans = tokens
      .map((token) => {
        const styles: string[] = [];

        if (token.color) styles.push(`color:${token.color}`);
        if (token.bgColor) styles.push(`background-color:${token.bgColor}`);
        if (token.fontStyle) {
          // fontStyle is a bitmask in Shiki: 1=italic, 2=bold, 4=underline
          if (token.fontStyle & 1) styles.push("font-style:italic");
          if (token.fontStyle & 2) styles.push("font-weight:bold");
          if (token.fontStyle & 4) styles.push("text-decoration:underline");
        }

        const styleAttr = styles.length ? ` style="${styles.join(";")}"` : "";
        return `<span${styleAttr}>${escapeHtml(token.content)}</span>`;
      })
      .join("");

    return `<span class="line">${tokenSpans}</span>`;
  });

  const codeContent = lineHtmlParts.join("\n");

  return (
    `<pre class="shiki ${escapeHtml(themeName)}" style="background-color:${bg};color:${fg}" tabindex="0">` +
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
  private minLoadedChunk = Infinity;
  private maxLoadedChunk = -Infinity;
  private scrollHandler?: () => void;
  private currentPreviewElement?: HTMLElement;
  private isRendering = false;
  private lineParser?: LazyLineParser;
  private abortController?: AbortController;

  /**
   * Stores the GrammarState produced at the *end* of each chunk so the next
   * sequential chunk can resume tokenisation without re-parsing everything
   * from the top
   */
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
      console.log("[Renderer] Loading language grammar:", language);
      const langLoadResult = await HighlighterManager.loadLanguageIfNeeded(language);
      console.log("[Renderer] Language load result:", langLoadResult);

      if (langLoadResult.ok) {
        finalLanguageId = langLoadResult.value.grammar.name;
        console.log("[Renderer] Using language:", finalLanguageId, "(from grammar.name)");
      } else {
        console.log("[Renderer] Failed to load language grammar:", (langLoadResult as any).error);
      }
    }

    let finalThemeName = data.theme;
    let themeLoadError = false;

    if (data.theme) {
      console.log("[Renderer] Loading theme grammar:", data.theme);
      const themeResult = await HighlighterManager.loadThemeIfNeeded(data.theme);
      console.log("[Renderer] Theme load result:", themeResult);

      if (themeResult.ok) {
        finalThemeName = themeResult.value.jsonData?.name || themeResult.value.name;
        console.log("[Renderer] Using theme:", finalThemeName);
      } else {
        console.log("[Renderer] Failed to load theme grammar:", (themeResult as any).error);
        themeLoadError = true;
      }
    }

    if (themeLoadError) {
      const failedAdapter = PreviewRendererAdapterRegistry.instance.getAdapter("preview.failed");
      await failedAdapter.render(previewElement, {
        content: {
          title: "Preview error",
          message: "An error occurred while rendering this preview (Theme Load Error).",
        },
      });
      return;
    }

    let themeBg = "#1e1e1e";
    let themeFg = "#d4d4d4";

    try {
      const resolvedTheme = this.highlighter.getTheme(finalThemeName);
      if (resolvedTheme) {
        themeBg = resolvedTheme.bg ?? themeBg;
        themeFg = resolvedTheme.fg ?? themeFg;
      }
    } catch {
      // defaults
    }

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

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalLines);

      let chunkText: string;
      if (this.lineParser) {
        chunkText = this.lineParser.getLines(start, end).join("\n");
      } else {
        const lines = content.split("\n");
        chunkText = lines.slice(start, end).join("\n");
      }

      // ----------------------------------------------------------------
      // Tokenise — reuse the GrammarState from the previous chunk so the
      // highlighter knows what scope it's "inside" at this point in the file.
      //
      // For prepend chunks (chunkIndex < initialChunk) we don't have a prior
      // state readily available, so we fall back to no state. This is still
      // much better than the original for append chunks, which is the common
      // scroll-down case.
      // ----------------------------------------------------------------

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
        console.warn("[Renderer] codeToTokens failed, falling back to codeToHtml:", err);

        const html = this.highlighter.codeToHtml(chunkText, {
          lang: finalLanguageId,
          theme: finalThemeName,
        });

        const chunkContainer = document.createElement("div");
        chunkContainer.innerHTML = html;
        chunkContainer.dataset.chunkIndex = String(chunkIndex);
        this.applyLineDecorations(chunkContainer, start, metadata?.highlightLine);
        this.insertChunkIntoDOM(previewElement, chunkContainer, position);
        return;
      }

      // save the state so the *next* sequential chunk can pick it up.
      if (nextGrammarState) {
        this.grammarStates.set(chunkIndex, nextGrammarState);
      }

      const html = makeHtmlFromTokens(lineTokens, themeBg, themeFg, finalThemeName);

      const chunkContainer = document.createElement("div");
      chunkContainer.innerHTML = html;
      chunkContainer.dataset.chunkIndex = String(chunkIndex);

      this.applyLineDecorations(chunkContainer, start, metadata?.highlightLine);
      this.insertChunkIntoDOM(previewElement, chunkContainer, position);
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

  private applyLineDecorations(
    chunkContainer: HTMLElement,
    startLineIndex: number,
    highlightLineNum: number | undefined,
  ): void {
    const showLineNumbers = (__PREVIEW_CFG__ as PreviewManagerConfig).showLineNumbers;
    if (!showLineNumbers && highlightLineNum === undefined) return;

    const linesEls = chunkContainer.querySelectorAll(".line");
    const localHighlightIndex = highlightLineNum !== undefined ? highlightLineNum - startLineIndex : -1;

    linesEls.forEach((lineEl, i) => {
      if (showLineNumbers) {
        (lineEl as HTMLElement).dataset.line = String(startLineIndex + i + 1);
      }
      if (i === localHighlightIndex) {
        lineEl.classList.add("highlighted");
      }
    });
  }

  private insertChunkIntoDOM(
    previewElement: HTMLElement,
    chunkContainer: HTMLElement,
    position: "append" | "prepend",
  ): void {
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
  }
}
