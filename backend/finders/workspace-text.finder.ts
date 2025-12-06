import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../shared/adapters-namespace";
import { TextSearchMatch } from "../../shared/exchange/workspace-text-search";
import { PreviewData } from "../../shared/extension-webview-protocol";
import { Globals } from "../globals";
import { loadWebviewHtml } from "../utils/files";
import { FuzzyProvider } from "./fuzzy-provider";

export class WorkspaceTextSearchProvider implements FuzzyProvider {
  public readonly fuzzyAdapterType: FuzzyProviderType = "workspace-text-search";
  public readonly previewAdapterType: PreviewRendererType = "code-with-highlight";
  public readonly supportsDynamicSearch = true;

  constructor(private readonly panel: vscode.WebviewPanel) {}

  async loadWebviewHtml() {
    let rawHtml = await loadWebviewHtml("ui", "views", "file-fuzzy.view.html");

    const replace = (search: string, distPath: string) => {
      const fullUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(Globals.EXTENSION_URI, distPath));
      rawHtml = rawHtml.replace(search, fullUri.toString());
    };

    replace("{{style}}", "ui/style/style.css");
    replace("{{script}}", "ui-dist/index.js");

    return rawHtml;
  }

  /**
   * Retorna lista vazia inicialmente
   */
  async querySelectableOptions() {
    return {
      results: [],
      query: "",
      message: "Type to search in workspace...",
    };
  }

  async searchOptions(query: string): Promise<any> {
    if (!query || query.trim().length === 0) {
      return {
        results: [],
        query: "",
      };
    }

    if (query.length < 2) {
      return {
        results: [],
        query: query,
      };
    }

    const matches: TextSearchMatch[] = [];
    const searchTerm = query.toLowerCase();

    try {
      const files = await vscode.workspace.findFiles("**/*", "**/node_modules/**", 1000);

      for (const uri of files) {
        try {
          const document = await vscode.workspace.openTextDocument(uri);

          const text = document.getText();
          if (text.length > 500000) continue;

          const lines = text.split("\n");
          for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const lowerLine = line.toLowerCase();

            if (lowerLine.includes(searchTerm)) {
              const column = lowerLine.indexOf(searchTerm);

              matches.push({
                file: uri.fsPath,
                line: lineIndex + 1,
                column: column + 1,
                text: line,
                preview: line.trim(),
              });

              if (matches.length >= 200) break;
            }
          }

          if (matches.length >= 200) break;
        } catch (_error) {
          continue;
        }
      }

      return {
        results: matches,
        query: query,
        message: matches.length === 0 ? `No results found for "${query}"` : undefined,
      };
    } catch (error) {
      console.error("Search error:", error);
      return {
        results: [],
        query: query,
        message: "Search failed. Please try again.",
      };
    }
  }

  async getPreviewData(identifier: string): Promise<PreviewData> {
    const parts = identifier.split(":");
    const filePath = parts[0];
    const line = parts[1];

    try {
      const uri = vscode.Uri.file(filePath);
      const document = await vscode.workspace.openTextDocument(uri);

      const lineNum = parseInt(line) - 1;
      const startLine = Math.max(0, lineNum - 5);
      const endLine = Math.min(document.lineCount - 1, lineNum + 5);

      const content = document.getText(new vscode.Range(startLine, 0, endLine + 1, 0));

      const language = document.languageId;

      return {
        content,
        language,
        metadata: {
          filePath,
          highlightLine: lineNum - startLine,
          totalLines: document.lineCount,
        },
      };
    } catch (error) {
      return {
        content: "[Unable to read file]",
        language: "text",
      };
    }
  }

  async onSelect(identifier: string) {
    const parts = identifier.split(":");
    const filePath = parts[0];
    const line = parts[1];
    const column = parts[2] || "1";

    try {
      const uri = vscode.Uri.file(filePath);
      const position = new vscode.Position(parseInt(line) - 1, parseInt(column) - 1);

      const editor = await vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(position, position),
      });

      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }
}
