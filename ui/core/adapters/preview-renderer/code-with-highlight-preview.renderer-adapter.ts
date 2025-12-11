import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { toInnerHTML } from "../../../utils/html";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { SyntaxHighlighter } from "../../registry/preview-adapter.registry";

@PreviewRendererAdapter({
  adapter: "preview.codeHighlighted",
})
export class CodeWithHighlightPreviewRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;

  constructor(private highlighter: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: PreviewData<string>, theme: string): Promise<void> {
    const { content, language = "text", metadata } = data;

    if (!this.highlighter) {
      previewElement.innerHTML = `<pre style="padding: 1rem; overflow: auto;">${toInnerHTML(content)}</pre>`;
      return;
    }

    try {
      let html = this.highlighter.codeToHtml(content, {
        lang: language,
        theme,
      });

      if (metadata?.highlightLine !== undefined) {
        html = this.addLineHighlight(html, metadata.highlightLine);
      }

      previewElement.innerHTML = html;
    } catch (error) {
      console.error("Failed to render code preview:", error);
      previewElement.innerHTML = `<pre>${toInnerHTML(content)}</pre>`;
    }
  }

  private addLineHighlight(html: string, lineIndex: number): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const pre = doc.querySelector("pre");

    if (!pre) return html;

    const style = doc.createElement("style");
    style.textContent = `
      .shiki .line.highlighted {
        background-color: var(--vscode-editor-findMatchHighlightBackground) !important; 
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

  setHighlighter(highlighter: SyntaxHighlighter): void {
    this.highlighter = highlighter;
  }
}
