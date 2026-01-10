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
const MAX_FILE_SIZE_FOR_FULL_PARSE = 5 * 1024 * 1024; // 5MB

class LazyLineParser {
  private lineCache = new Map<number, string>();
  private lineOffsets: number[] | null = null;
  private totalLines = 0;

  constructor(private text: string) {
    this.indexLines();
  }

  private indexLines(): void {
    // Só indexa as posições das quebras de linha, não cria strings
    this.lineOffsets = [0];
    let lastNewline = 0;

    for (let i = 0; i < this.text.length; i++) {
      if (this.text[i] === "\n") {
        this.lineOffsets.push(i + 1);
        lastNewline = i;
      }
    }

    // Se o arquivo não termina com \n, adiciona o final
    if (lastNewline < this.text.length - 1) {
      this.lineOffsets.push(this.text.length);
    }

    this.totalLines = this.lineOffsets.length - 1;
  }

  getTotalLines(): number {
    return this.totalLines;
  }

  getLines(start: number, end: number): string[] {
    if (!this.lineOffsets) return [];

    const lines: string[] = [];
    const actualEnd = Math.min(end, this.totalLines);

    for (let i = start; i < actualEnd; i++) {
      // Usa cache se já extraiu essa linha
      let line = this.lineCache.get(i);

      if (line === undefined) {
        const startPos = this.lineOffsets[i];
        const endPos = this.lineOffsets[i + 1];
        line = this.text.substring(startPos, endPos - 1); // -1 para remover \n

        // Cacheia apenas linhas já acessadas
        if (this.lineCache.size < 10000) {
          // Limita cache
          this.lineCache.set(i, line);
        }
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

  constructor(private highlighter: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: PreviewData<TextPreviewContent>, theme: string): Promise<void> {
    let {
      content: { text },
      language = "text",
      metadata,
      overrideTheme,
    } = data;

    language = language === "txt" ? "text" : language;
    const renderTheme = overrideTheme ?? theme;

    if (!this.highlighter) {
      previewElement.innerHTML = `<pre style="padding:1rem;">${toInnerHTML(text)}</pre>`;
      return;
    }

    // Cleanup anterior
    this.cleanup();

    previewElement.innerHTML = "";
    previewElement.scrollTop = 0;
    this.loadedChunks.clear();
    this.minLoadedChunk = Infinity;
    this.maxLoadedChunk = -Infinity;
    this.currentPreviewElement = previewElement;

    // Usa parser lazy para arquivos grandes
    const useLayParsing = text.length > MAX_FILE_SIZE_FOR_FULL_PARSE;

    let lines: string[];
    let totalLines: number;

    if (useLayParsing) {
      this.lineParser = new LazyLineParser(text);
      totalLines = this.lineParser.getTotalLines();
      lines = []; // Não precisa do array completo
    } else {
      lines = text.split("\n");
      totalLines = lines.length;
      this.lineParser = undefined;
    }

    const highlightLine = metadata?.highlightLine ?? 0;
    const initialChunk = Math.floor(highlightLine / CHUNK_SIZE);

    const [langLoadResult, themeLoadResult] = await Promise.all([
      HighlighterManager.loadLanguageIfNedeed(language),
      HighlighterManager.loadThemeIfNeeded(renderTheme),
    ]);

    if (!langLoadResult.ok || !themeLoadResult.ok) {
      const failedAdapter = PreviewRendererAdapterRegistry.instance.getAdapter("preview.failed");
      await failedAdapter.render(
        previewElement,
        {
          content: {
            title: "Preview error",
            message: "An error occurred while rendering this preview.",
          },
        },
        renderTheme,
      );
      return;
    }

    const renderChunk = async (chunkIndex: number, position: "append" | "prepend" = "append") => {
      if (this.loadedChunks.has(chunkIndex)) return;
      if (chunkIndex < 0 || chunkIndex * CHUNK_SIZE >= totalLines) return;

      this.loadedChunks.add(chunkIndex);
      this.minLoadedChunk = Math.min(this.minLoadedChunk, chunkIndex);
      this.maxLoadedChunk = Math.max(this.maxLoadedChunk, chunkIndex);

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalLines);

      // Extrai apenas as linhas necessárias
      const chunkLines = this.lineParser ? this.lineParser.getLines(start, end) : lines.slice(start, end);

      const chunkText = chunkLines.join("\n");

      const html = this.highlighter.codeToHtml(chunkText, {
        lang: language,
        theme: renderTheme,
      });

      const chunkContainer = document.createElement("div");
      chunkContainer.innerHTML = html;

      if ((__PREVIEW_CFG__ as PreviewManagerConfig).showLineNumbers) {
        const linesEls = chunkContainer.querySelectorAll(".line");
        linesEls.forEach((lineEl, i) => {
          const absoluteLineNumber = start + i + 1;
          (lineEl as HTMLElement).dataset.line = String(absoluteLineNumber);
        });
      }

      if (metadata?.highlightLine !== undefined) {
        const localIndex = metadata.highlightLine - start;
        if (localIndex >= 0 && localIndex < end - start) {
          const line = chunkContainer.querySelectorAll(".line")[localIndex];
          line?.classList.add("highlighted");
        }
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

    // Renderiza primeiro chunk imediatamente para feedback visual rápido
    await renderChunk(initialChunk);

    // Carrega chunks adjacentes em background
    const adjacentChunks: Promise<void>[] = [];
    for (let i = 1; i <= INITIAL_CHUNKS_TO_LOAD; i++) {
      adjacentChunks.push(renderChunk(initialChunk + i, "append"));
      adjacentChunks.push(renderChunk(initialChunk - i, "prepend"));
    }

    // Não bloqueia na renderização dos chunks adjacentes
    Promise.all(adjacentChunks).then(() => {
      // Scroll para a linha destacada após carregar contexto
      if (metadata?.highlightLine !== undefined) {
        const highlightedLine = previewElement.querySelector(".line.highlighted");
        if (highlightedLine) {
          highlightedLine.scrollIntoView({ block: "center", behavior: "instant" });
        }
      }
    });

    let ticking = false;

    this.scrollHandler = () => {
      if (ticking || this.isRendering) return;

      ticking = true;
      requestAnimationFrame(async () => {
        const { scrollTop, scrollHeight, clientHeight } = previewElement;

        this.isRendering = true;

        try {
          const maxChunk = this.maxLoadedChunk;
          const minChunk = this.minLoadedChunk;

          if (scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD) {
            await renderChunk(maxChunk + 1, "append");
          }

          if (scrollTop <= SCROLL_THRESHOLD) {
            await renderChunk(minChunk - 1, "prepend");
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
