import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewManagerConfig } from "../../../../shared/exchange/extension-config";
import { HighlightedCodePreviewData } from "../../../../shared/extension-webview-protocol";
import { toInnerHTML } from "../../../utils/html";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { PreviewRendererAdapterRegistry, SyntaxHighlighter } from "../../registry/preview-adapter.registry";
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
    let {
      content: { text },
      language = "text",
      metadata,
    } = data;

    language = language === "txt" ? "text" : language;

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

    const loadResult = await HighlighterManager.loadLanguageIfNedeed(language);
    if (!loadResult.ok) {
      const failedAdapter = PreviewRendererAdapterRegistry.instance.getAdapter("preview.failed");
      await failedAdapter.render(
        previewElement,
        {
          content: {
            title: "Preview error",
            message: "An error occurred while rendering this preview.",
          },
        },
        theme,
      );
      return;
    }

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
        if (localIndex >= 0) {
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

    await renderChunk(initialChunk);

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
