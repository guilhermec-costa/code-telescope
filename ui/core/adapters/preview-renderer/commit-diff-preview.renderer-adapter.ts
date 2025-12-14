import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { SyntaxHighlighter } from "../../registry/preview-adapter.registry";

/**
 * Adapter para preview de commits com diff
 */
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

    if (!this.highlighter) {
      previewElement.innerHTML = this.renderPlainDiff(content);
      return;
    }

    try {
      const html = await this.highlighter.codeToHtml(content, {
        lang: language,
        theme: theme,
      });
      previewElement.innerHTML = html;
    } catch (error) {
      console.error("Failed to render commit diff:", error);
      previewElement.innerHTML = this.renderPlainDiff(content);
    }
  }

  clear(previewElement: HTMLElement): void {
    previewElement.innerHTML = "";
  }

  /**
   * Renderiza diff sem highlighter com estilo básico
   */
  private renderPlainDiff(content: string): string {
    const lines = content.split("\n");
    const styledLines = lines
      .map((line) => {
        let className = "";

        if (line.startsWith("+++") || line.startsWith("---")) {
          className = "diff-header";
        } else if (line.startsWith("+")) {
          className = "diff-added";
        } else if (line.startsWith("-")) {
          className = "diff-removed";
        } else if (line.startsWith("@@")) {
          className = "diff-hunk";
        } else if (line.startsWith("commit ") || line.startsWith("Author:") || line.startsWith("Date:")) {
          className = "diff-meta";
        }

        return `<div class="${className}">${this.escapeHtml(line)}</div>`;
      })
      .join("");

    return `
      <div class="diff-container">
        ${styledLines}
      </div>
      <style>
        .diff-container {
          padding: 1rem;
          font-family: var(--vscode-editor-font-family), monospace;
          font-size: 13px;
          line-height: 1.4;
          white-space: pre;
          overflow: auto;
        }
        
        .diff-meta {
          color: var(--vscode-textLink-foreground);
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        
        .diff-header {
          color: var(--vscode-descriptionForeground);
          font-weight: 500;
        }
        
        .diff-hunk {
          color: var(--vscode-textLink-activeForeground);
          background: var(--vscode-editor-lineHighlightBackground);
          font-weight: 500;
          margin: 0.5rem 0;
        }
        
        .diff-added {
          color: #4ec9b0;
          background: rgba(78, 201, 176, 0.1);
        }
        
        .diff-removed {
          color: #f48771;
          background: rgba(244, 135, 113, 0.1);
        }
      </style>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
