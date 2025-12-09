import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { SyntaxHighlighter } from "../registries/preview-adapter.registry";

export class CodeWithHighlightPreviewRendererAdapter implements IPreviewRendererAdapter {
  readonly type: PreviewRendererType = "preview.codeHighlighted";

  constructor(private highlighter: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void> {
    const { content, language = "text", metadata } = data;

    if (!this.highlighter) {
      previewElement.innerHTML = `<pre style="padding: 1rem; overflow: auto;">${this.escapeHtml(content)}</pre>`;
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

    const docStyle = getComputedStyle(document.documentElement);
    const highlightColor = docStyle.getPropertyValue("--vscode-editor-findMatchHighlightBackground").trim();
    const style = doc.createElement("style");
    style.textContent = `
      .shiki .line.highlighted {
        background-color: ${highlightColor} !important; 
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

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
