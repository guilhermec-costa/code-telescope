import { codeToHtml } from "shiki";
import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { IPreviewAdapter } from "../abstractions/preview-adapter";
import { SyntaxHighlighter } from "../registries/preview-adapter-registry";

export class BranchPreviewAdapter implements IPreviewAdapter {
  readonly type: PreviewRendererType = "preview.codeHighlighted";

  constructor(private readonly highlighter: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void> {
    const { content } = data;
    try {
      const html = await codeToHtml(content, {
        lang: "markdown",
        theme: theme,
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
