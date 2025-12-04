import * as vscode from "vscode";
import { FuzzyAdapter } from "../../shared/adapters-namespace";
import { PreviewData } from "../../shared/extension-webview-protocol";
import { Globals } from "../globals";
import { loadWebviewHtml } from "../utils/files";
import { FuzzyProvider } from "./fuzzy-provider";

export class WorkspaceTextSearchProvider implements FuzzyProvider {
  public readonly type: FuzzyAdapter = "workspace-text-search";
  private searchQuery: string = "scheduler";

  constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly initialQuery: string = "",
  ) {
    // this.searchQuery = initialQuery;
  }

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

  async querySelectableOptions() {
    if (!this.searchQuery) {
      return { results: [] };
    }

    await vscode.workspace.findTextInFiles({ pattern: this.searchQuery }, (results) => {
      const matches: TextSearchMatch[] = [];
      const casted = results as vscode.TextSearchMatch;
      console.log(casted);
    });

    return { results: [], query: this.searchQuery };
  }

  async getPreviewData(identifier: string): Promise<PreviewData> {
    const [filePath, line] = identifier.split(":");

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
    // identifier format: "file:line:column"
    const [filePath, line, column] = identifier.split(":");

    const uri = vscode.Uri.file(filePath);
    const position = new vscode.Position(parseInt(line) - 1, parseInt(column) - 1);

    const editor = await vscode.window.showTextDocument(uri, {
      selection: new vscode.Range(position, position),
    });

    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }
}

interface TextSearchMatch {
  file: string;
  line: number;
  column: number;
  text: string;
  preview: string;
}
