import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { execCmd } from "../../utils/commands";
import { resolvePathExt } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileContentCache } from "../common/cache/file-content.cache";
import { HighlightContentCache } from "../common/cache/highlight-content.cache";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

interface WorkspaceSymbolData {
  name: string;
  kind: vscode.SymbolKind;
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
  previewRenderer: "preview.codeHighlighted",
})
export class WorkspaceSymbolsFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  async querySelectableOptions(): Promise<WorkspaceSymbolFinderData> {
    const symbols = await this.getWorkspaceSymbols();

    const displayTexts = symbols.map((symbol) => {
      const symbolName = symbol.name.padEnd(40);
      const container = symbol.containerName ? ` [${symbol.containerName}]` : "";
      const filePath = vscode.workspace.asRelativePath(symbol.uri);

      return `${symbolName} ${filePath}${container}`;
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

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const index = parseInt(identifier, 10);
    const symbols = await this.getWorkspaceSymbols();
    const selected = symbols[index];

    if (!selected) {
      return {
        content: { path: "", text: "No symbol selected", isCached: false },
        language: "plaintext",
      };
    }

    const filePath = selected.uri.fsPath;
    let language = resolvePathExt(filePath);

    const highlightLine = selected.location.range.start.line;

    const cachedHighlightedContent = HighlightContentCache.instance.get(filePath);
    if (cachedHighlightedContent) {
      return {
        content: { path: filePath, text: cachedHighlightedContent, isCached: true },
        language,
        metadata: {
          highlightLine,
        },
      };
    }

    const content = await FileContentCache.instance.get(filePath);

    return {
      content: {
        path: filePath,
        text: content,
        isCached: false,
      },
      language,
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
        codicon: this.getSymbolCodicon(symbol.kind),
        containerName: symbol.containerName,
        location: symbol.location,
        uri: symbol.location.uri,
      }));
    } catch (error) {
      vscode.window.showErrorMessage(`Error fetching workspace symbols: ${error}`);
      return [];
    }
  }

  /**
   * Returns an icon for the symbol kind
   */
  private getSymbolCodicon(kind: vscode.SymbolKind): string {
    const icons: Record<number, string> = {
      [vscode.SymbolKind.File]: "file",
      [vscode.SymbolKind.Module]: "package",
      [vscode.SymbolKind.Namespace]: "symbol-namespace",
      [vscode.SymbolKind.Package]: "package",
      [vscode.SymbolKind.Class]: "symbol-class",
      [vscode.SymbolKind.Method]: "symbol-method",
      [vscode.SymbolKind.Property]: "symbol-property",
      [vscode.SymbolKind.Field]: "symbol-field",
      [vscode.SymbolKind.Constructor]: "symbol-constructor",
      [vscode.SymbolKind.Enum]: "symbol-enum",
      [vscode.SymbolKind.Interface]: "symbol-interface",
      [vscode.SymbolKind.Function]: "symbol-function",
      [vscode.SymbolKind.Variable]: "symbol-variable",
      [vscode.SymbolKind.Constant]: "symbol-constant",
      [vscode.SymbolKind.String]: "symbol-string",
      [vscode.SymbolKind.Number]: "symbol-number",
      [vscode.SymbolKind.Boolean]: "symbol-boolean",
      [vscode.SymbolKind.Array]: "symbol-array",
      [vscode.SymbolKind.Object]: "symbol-object",
      [vscode.SymbolKind.Key]: "key",
      [vscode.SymbolKind.Null]: "circle-slash",
      [vscode.SymbolKind.EnumMember]: "symbol-enum-member",
      [vscode.SymbolKind.Struct]: "symbol-struct",
      [vscode.SymbolKind.Event]: "symbol-event",
      [vscode.SymbolKind.Operator]: "symbol-operator",
      [vscode.SymbolKind.TypeParameter]: "symbol-type-parameter",
    };

    return icons[kind] ?? "symbol-misc";
  }
}
