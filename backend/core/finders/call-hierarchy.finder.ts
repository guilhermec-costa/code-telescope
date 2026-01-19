import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { CallHierarchyData, CallHierarchyFinderData } from "../../../shared/exchange/call-hierarchy";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { resolvePathExt } from "../../utils/files";
import { getSymbolCodicon } from "../../utils/symbol";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileContentCache } from "../common/cache/file-content.cache";
import { PreContextManager } from "../common/pre-context";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider that shows call hierarchy for the symbol at cursor.
 *
 * Shows incoming calls (who calls this) and outgoing calls (what this calls).
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.callHierarchy",
  previewRenderer: "preview.codeHighlighted",
})
export class CallHierarchyFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  async querySelectableOptions(): Promise<CallHierarchyFinderData> {
    const calls = await this.getCallHierarchy();

    if (!calls || calls.length === 0) {
      return {
        calls: [],
        codicons: [],
        displayTexts: ["No call hierarchy available. Place cursor on a function/method."],
        currentSymbol: undefined,
      };
    }

    const { displayTexts, codicons } = calls.reduce<{ displayTexts: string[]; codicons: string[] }>(
      (acc, call) => {
        const typeLabel = call.type === "incoming" ? "Called by" : "Calls";
        const location = `${call.relativePath}:${call.line}`.padEnd(50);
        const signature = call.detail || call.name;

        acc.displayTexts.push(`${typeLabel.padEnd(10)} ${location} ${signature}`);
        acc.codicons.push(getSymbolCodicon(call.kind));
        return acc;
      },
      { displayTexts: [], codicons: [] },
    );

    return {
      calls,
      displayTexts,
      currentSymbol: calls[0]?.containerName,
      codicons,
    };
  }

  async onSelect(selectedIndex: string) {
    const index = parseInt(selectedIndex, 10);
    const calls = await this.getCallHierarchy();
    const selected = calls[index];

    if (!selected) return;

    // Open the file and navigate to the call location
    const document = await vscode.workspace.openTextDocument(selected.uri);
    const editor = await vscode.window.showTextDocument(document);

    const position = selected.selectionRange.start;
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(selected.selectionRange, vscode.TextEditorRevealType.InCenter);
  }

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const index = parseInt(identifier, 10);
    const calls = await this.getCallHierarchy();
    const selected = calls[index];

    if (!selected) {
      return {
        content: {
          path: "",
          kind: "text",
          text: "No call selected",
        },
        language: "plaintext",
      };
    }

    const filePath = selected.uri.fsPath;
    const language = resolvePathExt(filePath);
    const highlightLine = selected.line - 1;

    const content = await FileContentCache.instance.get(filePath);

    return {
      content: {
        path: filePath,
        text: content as string,
        kind: "text",
      },
      language,
      metadata: {
        highlightLine,
      },
    };
  }

  /**
   * Gets call hierarchy for the symbol at the current cursor position
   */
  private async getCallHierarchy(): Promise<CallHierarchyData[]> {
    const ctx = PreContextManager.instance.getContext();
    if (!ctx) {
      vscode.window.showWarningMessage("No editor context captured. Please open a file first.");
      return [];
    }
    const { document, position } = ctx;

    try {
      // Prepare call hierarchy
      const items = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
        "vscode.prepareCallHierarchy",
        document.uri,
        position,
      );

      if (!items || items.length === 0) {
        vscode.window.showInformationMessage("No call hierarchy available at cursor position");
        return [];
      }

      const rootItem = items[0];
      const allCalls: CallHierarchyData[] = [];

      // Get incoming calls (who calls this function)
      const incomingCalls = await vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>(
        "vscode.provideIncomingCalls",
        rootItem,
      );

      if (incomingCalls) {
        for (const call of incomingCalls) {
          allCalls.push({
            type: "incoming",
            item: call.from,
            fromRanges: call.fromRanges,
            uri: call.from.uri,
            name: call.from.name,
            detail: call.from.detail!,
            kind: call.from.kind,
            range: call.from.range,
            selectionRange: call.from.selectionRange,
            relativePath: vscode.workspace.asRelativePath(call.from.uri),
            line: call.from.selectionRange.start.line + 1,
          });
        }
      }

      // Get outgoing calls (what this function calls)
      const outgoingCalls = await vscode.commands.executeCommand<vscode.CallHierarchyOutgoingCall[]>(
        "vscode.provideOutgoingCalls",
        rootItem,
      );

      if (outgoingCalls) {
        for (const call of outgoingCalls) {
          allCalls.push({
            type: "outgoing",
            item: call.to,
            fromRanges: call.fromRanges,
            uri: call.to.uri,
            name: call.to.name,
            detail: call.to.detail!,
            kind: call.to.kind,
            range: call.to.range,
            selectionRange: call.to.selectionRange,
            containerName: rootItem.name,
            relativePath: vscode.workspace.asRelativePath(call.to.uri),
            line: call.to.selectionRange.start.line + 1,
          });
        }
      }

      // Sort: incoming calls first, then outgoing
      allCalls.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "incoming" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return allCalls;
    } catch (error) {
      vscode.window.showErrorMessage(`Error fetching call hierarchy: ${error}`);
      return [];
    }
  }
}
