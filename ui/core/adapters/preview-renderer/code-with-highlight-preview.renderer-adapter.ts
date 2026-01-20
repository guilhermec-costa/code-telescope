import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewManagerConfig } from "../../../../shared/exchange/extension-config";
import { PreviewData, TextPreviewContent } from "../../../../shared/extension-webview-protocol";
import { toInnerHTML } from "../../../utils/html";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { PreviewRendererAdapterRegistry, SyntaxHighlighter } from "../../registry/preview-adapter.registry";
import { HighlighterManager } from "../../render/highlighter-manager";

const CHUNK_SIZE = 150;
const SCROLL_THRESHOLD = 300;
const INITIAL_CHUNKS_TO_LOAD = 2;
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

    for (let i = 0; i < this.text.length; i++) {
      if (this.text[i] === "\n") {
        this.lineOffsets.push(i + 1);
      }
    }

    if (this.text[this.text.length - 1] !== "\n") {
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

@PreviewRendererAdapter({
  adapter: "preview.codeHighlighted",
})
export class CodeWithHighlightPreviewRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;
  private loadedChunks = new Set<number>();
  private minLoadedChunk = Infinity;
  private maxLoadedChunk = -Infinity;
  private scrollHandler?: () => void;
  private currentPreviewElement?: HTMLElement;
  private isRendering = false;
  private lineParser?: LazyLineParser;
  private abortController?: AbortController;

  constructor(private highlighter: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: PreviewData<TextPreviewContent>, theme: string): Promise<void> {
    let {
      content: { text },
      language = "text",
      metadata,
      overrideTheme,
    } = data;

    language = language === "txt" ? "text" : language;
    const initialThemeName = overrideTheme ?? theme;

    if (!this.highlighter) {
      previewElement.innerHTML = `<pre style="padding:1rem;">${toInnerHTML(text)}</pre>`;
      return;
    }

    this.cleanup();

    previewElement.innerHTML = "";
    previewElement.scrollTop = 0;
    this.loadedChunks.clear();
    this.minLoadedChunk = Infinity;
    this.maxLoadedChunk = -Infinity;
    this.currentPreviewElement = previewElement;
    this.abortController = new AbortController();

    const THRESHOLD = 5000;
    let totalLines: number;

    if (text.length > THRESHOLD) {
      this.lineParser = new LazyLineParser(text);
      totalLines = this.lineParser.getTotalLines();
    } else {
      this.lineParser = undefined;
      totalLines = text.split("\n").length;
    }

    const highlightLine = metadata?.highlightLine ?? 0;
    const initialChunk = Math.floor(highlightLine / CHUNK_SIZE);

    const langLoadResult = await HighlighterManager.loadLanguageIfNeeded(language);

    let shikiActiveTheme = initialThemeName;
    let themeLoadError = false;

    if (metadata && metadata.themeJson) {
      try {
        const themeJson = metadata.themeJson;

        const customThemeName = themeJson.name || "vscode-custom-theme";
        themeJson.name = customThemeName;

        await this.highlighter.loadTheme(themeJson);

        shikiActiveTheme = customThemeName;
      } catch (e) {
        console.error("[Highlighter] Failed to load custom VS Code theme JSON. Falling back.", e);
        const type = metadata.themeType;
        shikiActiveTheme = type === "light" ? "min-light" : "min-dark";

        await HighlighterManager.loadThemeIfNeeded(shikiActiveTheme);
      }
    } else {
      const themeResult = await HighlighterManager.loadThemeIfNeeded(initialThemeName);
      if (!themeResult.ok) {
        themeLoadError = true;
      }
    }

    if (!langLoadResult.ok) {
      console.log(`[Highlighter] Failed to load language "${language}". Falling back to plain text.`);
      language = "text";
    }

    if (themeLoadError) {
      const failedAdapter = PreviewRendererAdapterRegistry.instance.getAdapter("preview.failed");
      await failedAdapter.render(
        previewElement,
        {
          content: {
            title: "Preview error",
            message: "An error occurred while rendering this preview (Theme Load Error).",
          },
        },
        initialThemeName,
      );
      return;
    }

    const renderChunk = async (chunkIndex: number, position: "append" | "prepend" = "append"): Promise<void> => {
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
        const lines = text.split("\n");
        chunkText = lines.slice(start, end).join("\n");
      }

      const html = this.highlighter.codeToHtml(chunkText, {
        lang: language,
        theme: shikiActiveTheme,
        bg: "transparent",
      } as any);

      const chunkContainer = document.createElement("div");
      chunkContainer.innerHTML = html;

      const showLineNumbers = (__PREVIEW_CFG__ as PreviewManagerConfig).showLineNumbers;
      const highlightLineNum = metadata?.highlightLine;

      if (showLineNumbers || highlightLineNum !== undefined) {
        const linesEls = chunkContainer.querySelectorAll(".line");
        const localHighlightIndex = highlightLineNum !== undefined ? highlightLineNum - start : -1;

        linesEls.forEach((lineEl, i) => {
          if (showLineNumbers) {
            (lineEl as HTMLElement).dataset.line = String(start + i + 1);
          }
          if (i === localHighlightIndex) {
            lineEl.classList.add("highlighted");
          }
        });
      }

      if (position === "prepend") {
        const prevHeight = previewElement.scrollHeight;
        previewElement.prepend(chunkContainer);
        const nextHeight = previewElement.scrollHeight;
        previewElement.scrollTop += nextHeight - prevHeight;
      } else {
        previewElement.appendChild(chunkContainer);
      }
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
          if (scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD) {
            await renderChunk(this.maxLoadedChunk + 1, "append");
          }
          if (scrollTop <= SCROLL_THRESHOLD) {
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
  }
}
