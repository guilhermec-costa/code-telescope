import { codeToHtml } from "shiki";
import { PreviewAdapter } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { IPreviewAdapter } from "./preview-adapter";

export class FilePreviewAdapter implements IPreviewAdapter {
  readonly type: PreviewAdapter = "workspace-file-finder";

  async render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void> {
    const { content, language = "text" } = data;

    try {
      const html = await codeToHtml(content, {
        lang: language,
        theme: theme,
      });
      previewElement.innerHTML = html;
    } catch (error) {
      console.error("Failed to render file preview:", error);
      previewElement.innerHTML = `<pre>${this.escapeHtml(content)}</pre>`;
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
