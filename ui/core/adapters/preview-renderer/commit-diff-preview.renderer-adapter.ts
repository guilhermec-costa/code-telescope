import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { SyntaxHighlighter } from "../../registry/preview-adapter.registry";

@PreviewRendererAdapter({
  adapter: "preview.commitDiff",
})
export class CommitDiffPreviewRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;

  private highlighter: SyntaxHighlighter;

  constructor(highlighter: SyntaxHighlighter) {
    this.highlighter = highlighter;
  }

  setHighlighter(highlighter: SyntaxHighlighter): void {
    this.highlighter = highlighter;
  }

  async render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void> {
    const { content, language = "diff" } = data;

    try {
      const html = this.highlighter.codeToHtml(content, {
        lang: language,
        theme,
      });
      previewElement.innerHTML = html;
    } catch (error) {
      console.error("Failed to render commit diff:", error);
    }
  }

  clear(previewElement: HTMLElement): void {
    previewElement.innerHTML = "";
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
