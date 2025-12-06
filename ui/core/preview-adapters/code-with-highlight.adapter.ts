import { codeToHtml } from "shiki";
import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { IPreviewAdapter } from "./preview-adapter";

export class CodeWithHighlightPreviewAdapter implements IPreviewAdapter {
  readonly type: PreviewRendererType = "code-with-highlight";

  async render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void> {
    const { content, language = "text", metadata } = data;
    console.log("Content in code with hight: ", content);

    try {
      let html = await codeToHtml(content, {
        lang: language,
        theme: theme,
      });

      if (metadata?.highlightLine !== undefined) {
        html = this.addLineHighlight(html, metadata.highlightLine);
      }

      previewElement.innerHTML = html;
    } catch (error) {
      console.error("Failed to render code preview:", error);
      previewElement.innerHTML = `<pre>${this.escapeHtml(content)}</pre>`;
    }
  }

  clear(previewElement: HTMLElement): void {
    previewElement.innerHTML = "";
  }

  private addLineHighlight(html: string, lineIndex: number): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const pre = doc.querySelector("pre");

    if (!pre) return html;

    const style = doc.createElement("style");
    style.textContent = `
      .shiki .line.highlighted {
        background-color: rgba(255, 0, 0, 0.15);
        border-left: 3px solid rgba(255, 200, 0, 0.8);
        padding-left: 1em;
        margin-left: -1em;
      }
    `;
    doc.head.appendChild(style);

    const lines = pre.querySelectorAll(".line");
    if (lines[lineIndex]) {
      lines[lineIndex].classList.add("highlighted");
    }

    return doc.documentElement.outerHTML;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
