import * as vscode from "vscode";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { execCmd } from "../../utils/commands";
import { getLanguageIdForFile } from "../../utils/files";
import { getSymbolCodicon } from "../../utils/symbol";
import { FileReader } from "../common/cache/file-reader";
import { PreContextManager } from "../common/pre-context";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";

interface DocumentSymbolData {
  name: string;
  kind: vscode.SymbolKind;
  kindName: string;
  containerName: string;
  codicon: string;
  range: vscode.Range;
  selectionRange: vscode.Range;
  uri: vscode.Uri;
}

interface DocumentSymbolFinderData {
  symbols: DocumentSymbolData[];
  displayTexts: string[];
}

/**
 * Fuzzy provider that retrieves symbols from the current document.
 *
 * Searches for symbols (classes, functions, variables, etc.) in the active editor.
 */
@FuzzyFinderAdapter({
  fuzzy: "document.symbols",
  previewRenderer: "preview.codeHighlighted",
  dataAdapter: "symbolsAdapter",
})
export class DocumentSymbolsFinder implements FuzzyFinderProvider {
  async querySelectableOptions(): Promise<DocumentSymbolFinderData> {
    const symbols = await this.getDocumentSymbols();
    const displayTexts = symbols.map((symbol) => {
      const symbolName = symbol.name.padEnd(40);
      const container = symbol.containerName ? ` [${symbol.containerName}]` : "";
      const line = `L${symbol.range.start.line + 1}`;
      return `${symbolName} ${line}${container}`;
    });

    return {
      symbols,
      displayTexts,
    };
  }

  async onSelect(selectedIndex: string) {
    const index = parseInt(selectedIndex, 10);
    const symbols = await this.getDocumentSymbols();
    const selected = symbols[index];

    if (!selected) return;

    const ctx = PreContextManager.instance.getContext();
    if (!ctx) return;

    const { document } = ctx;

    const position = selected.selectionRange.start;

    const doc = await vscode.workspace.openTextDocument(document.uri);

    const editor = await vscode.window.showTextDocument(doc);

    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(selected.range, vscode.TextEditorRevealType.InCenter);
  }

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const index = parseInt(identifier, 10);
    const symbols = await this.getDocumentSymbols();
    const selected = symbols[index];

    if (!selected) {
      return {
        content: {
          path: "",
          text: "No symbol selected",
          kind: "text",
        },
        language: "plaintext",
      };
    }

    const filePath = selected.uri.fsPath;
    const highlightLine = selected.selectionRange.start.line;
    const content = await FileReader.read(filePath);

    return {
      content: {
        kind: "text",
        path: filePath,
        text: content as string,
      },
      language: await getLanguageIdForFile(filePath),
      metadata: {
        highlightLine,
      },
    };
  }

  /**
   * Gets all symbols from the current document
   */
  private async getDocumentSymbols(): Promise<DocumentSymbolData[]> {
    try {
      const ctx = PreContextManager.instance.getContext();
      if (!ctx) {
        vscode.window.showWarningMessage("No active editor");
        return [];
      }

      const uri = ctx.document.uri;
      const symbols = await execCmd<vscode.DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", uri);

      if (!symbols) {
        return [];
      }

      const flattenedSymbols = this.flattenSymbolsRecursive(symbols, uri);

      return flattenedSymbols;
    } catch (error) {
      vscode.window.showErrorMessage(`Error fetching document symbols: ${error}`);
      return [];
    }
  }

  private flattenSymbolsRecursive(
    symbols: vscode.DocumentSymbol[],
    uri: vscode.Uri,
    containerName = "",
  ): DocumentSymbolData[] {
    const result: DocumentSymbolData[] = [];

    for (const symbol of symbols) {
      result.push({
        name: symbol.name,
        kind: symbol.kind,
        kindName: vscode.SymbolKind[symbol.kind],
        containerName: containerName,
        range: symbol.range,
        codicon: getSymbolCodicon(symbol.kind),
        selectionRange: symbol.selectionRange,
        uri: uri,
      });

      if (symbol.children && symbol.children.length > 0) {
        const childSymbols = this.flattenSymbolsRecursive(
          symbol.children,
          uri,
          containerName ? `${containerName}.${symbol.name}` : symbol.name,
        );
        result.push(...childSymbols);
      }
    }

    return result;
  }
}
