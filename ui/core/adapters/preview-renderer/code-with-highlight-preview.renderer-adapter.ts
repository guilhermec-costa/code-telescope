import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { HighlightedCodePreviewData } from "../../../../shared/extension-webview-protocol";
import { toInnerHTML } from "../../../utils/html";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { SyntaxHighlighter } from "../../registry/preview-adapter.registry";
import { HighlighterManager } from "../../render/highlighter-manager";

const CHUNK_SIZE = 200;
const SCROLL_THRESHOLD = 300;

@PreviewRendererAdapter({
  adapter: "preview.codeHighlighted",
})
export class CodeWithHighlightPreviewRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;

  private loadedChunks = new Set<number>();
  private scrollHandler?: () => void;

  constructor(private highlighter: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: HighlightedCodePreviewData, theme: string): Promise<void> {
    const {
      content: { text },
      language = "text",
      metadata,
    } = data;

    if (!this.highlighter) {
      previewElement.innerHTML = `<pre style="padding:1rem;">${toInnerHTML(text)}</pre>`;
      return;
    }

    previewElement.innerHTML = "";
    previewElement.scrollTop = 0;
    this.loadedChunks.clear();
    previewElement.removeEventListener("scroll", this.scrollHandler as any);

    const lines = text.split("\n");
    const totalLines = lines.length;
    const highlightLine = metadata?.highlightLine ?? 0;

    const initialChunk = Math.floor(highlightLine / CHUNK_SIZE);

    await HighlighterManager.loadLanguageIfNedeed(language);

    const renderChunk = async (chunkIndex: number, position: "append" | "prepend" = "append") => {
      if (this.loadedChunks.has(chunkIndex)) return;
      if (chunkIndex < 0 || chunkIndex * CHUNK_SIZE >= totalLines) return;

      this.loadedChunks.add(chunkIndex);

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalLines);
      const chunkText = lines.slice(start, end).join("\n");

      const html = this.highlighter.codeToHtml(chunkText, {
        lang: language,
        theme,
      });

      const container = document.createElement("div");
      container.dataset.chunk = String(chunkIndex);
      container.innerHTML = html;

      if (metadata?.highlightLine !== undefined) {
        const localIndex = metadata.highlightLine - start;
        if (localIndex >= 0) {
          const line = container.querySelectorAll(".line")[localIndex];
          line?.classList.add("highlighted");
        }
      }

      if (position === "prepend") {
        const prevHeight = previewElement.scrollHeight;
        previewElement.prepend(container);
        const nextHeight = previewElement.scrollHeight;
        previewElement.scrollTop += nextHeight - prevHeight;
      } else {
        previewElement.appendChild(container);
      }
    };

    await renderChunk(initialChunk);

    requestAnimationFrame(() => {
      previewElement.querySelector(".line.highlighted")?.scrollIntoView({ block: "center" });
    });

    let ticking = false;

    this.scrollHandler = () => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(async () => {
        const { scrollTop, scrollHeight, clientHeight } = previewElement;

        const maxChunk = Math.max(...this.loadedChunks);
        const minChunk = Math.min(...this.loadedChunks);

        if (scrollTop + clientHeight >= scrollHeight - SCROLL_THRESHOLD) {
          await renderChunk(maxChunk + 1, "append");
        }

        if (scrollTop <= SCROLL_THRESHOLD) {
          await renderChunk(minChunk - 1, "prepend");
        }

        ticking = false;
      });
    };

    previewElement.addEventListener("scroll", this.scrollHandler);
  }

  setHighlighter(highlighter: SyntaxHighlighter): void {
    this.highlighter = highlighter;
  }
}
