import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { SyntaxHighlighter } from "../registries/preview-adapter.registry";

export class BranchPreviewRendererAdapter implements IPreviewRendererAdapter {
  readonly type: PreviewRendererType = "preview.codeHighlighted";

  constructor(private readonly highlighter: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void> {
    const { content } = data;

    if (!this.highlighter) {
      previewElement.innerHTML = `<pre style="padding: 1rem; overflow: auto;">${this.escapeHtml(content)}</pre>`;
      return;
    }

    try {
      const html = this.highlighter.codeToHtml(content, {
        lang: "markdown",
        theme,
      });
      previewElement.innerHTML = html;
    } catch (_error) {
      previewElement.innerHTML = `<pre>${this.escapeHtml(content)}</pre>`;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
