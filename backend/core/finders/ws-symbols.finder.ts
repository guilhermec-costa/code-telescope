import * as vscode from "vscode";
import { TextPreviewData } from "../../../shared/extension-webview-protocol";
import { execCmd } from "../../utils/commands";
import { getLanguageIdForFile } from "../../utils/files";
import { getSymbolCodicon } from "../../utils/symbol";
import { FileReader } from "../common/cache/file-reader";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";

interface WorkspaceSymbolData {
  name: string;
  kind: vscode.SymbolKind;
  kindName: string;
  containerName: string;
  location: vscode.Location;
  uri: vscode.Uri;
}

interface WorkspaceSymbolFinderData {
  symbols: WorkspaceSymbolData[];
  displayTexts: string[];
}

/**
 * Fuzzy provider that retrieves workspace symbols.
 *
 * Searches for symbols (classes, functions, variables, etc.) across the entire workspace.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.symbols",
  previewRenderer: "preview.buffer",
  dataAdapter: "symbolsAdapter",
})
export class WorkspaceSymbolsFinder implements FuzzyFinderProvider {
  async querySelectableOptions(): Promise<WorkspaceSymbolFinderData> {
    const symbols = await this.getWorkspaceSymbols();

    const displayTexts = symbols.map((symbol) => {
      const symbolName = symbol.name.padEnd(40);
      const container = symbol.containerName ? ` [${symbol.containerName}]` : "";
      const filePath = vscode.workspace.asRelativePath(symbol.uri);

      return `${symbolName} -> ${filePath}${container}`;
    });

    return {
      symbols,
      displayTexts,
    };
  }

  async onSelect(selectedIndex: string) {
    const index = parseInt(selectedIndex, 10);
    const symbols = await this.getWorkspaceSymbols();
    const selected = symbols[index];

    if (!selected) return;

    const document = await vscode.workspace.openTextDocument(selected.uri);
    const editor = await vscode.window.showTextDocument(document);

    const position = selected.location.range.start;
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(selected.location.range, vscode.TextEditorRevealType.InCenter);
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData> {
    const index = parseInt(identifier, 10);
    const symbols = await this.getWorkspaceSymbols();
    const selected = symbols[index];

    if (!selected) {
      return {
        content: "No symbol selected",
        language: "plaintext",
        kind: "text",
      };
    }

    const filePath = selected.uri.fsPath;
    const highlightLine = selected.location.range.start.line;

    const content = await FileReader.read(filePath);

    return {
      content: content as string,
      kind: "text",
      language: getLanguageIdForFile(filePath),
      metadata: {
        highlightLine,
      },
    };
  }

  /**
   * Gets all workspace symbols
   */
  private async getWorkspaceSymbols(): Promise<WorkspaceSymbolData[]> {
    try {
      const symbolInformation = await execCmd<vscode.SymbolInformation[]>("vscode.executeWorkspaceSymbolProvider", "");

      if (!symbolInformation) {
        return [];
      }

      return symbolInformation.map((symbol) => ({
        name: symbol.name,
        kind: symbol.kind,
        kindName: vscode.SymbolKind[symbol.kind],
        codicon: getSymbolCodicon(symbol.kind),
        containerName: symbol.containerName,
        location: symbol.location,
        uri: symbol.location.uri,
      }));
    } catch (error) {
      vscode.window.showErrorMessage(`Error fetching workspace symbols: ${error}`);
      return [];
    }
  }
}
