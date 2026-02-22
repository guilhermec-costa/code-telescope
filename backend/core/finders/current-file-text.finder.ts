import * as vscode from "vscode";
import { TextPreviewData } from "../../../shared/extension-webview-protocol";
import { getLanguageIdForFile } from "../../utils/files";
import { FileReader } from "../common/cache/file-reader";
import { PreContextManager } from "../common/pre-context";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";
import { FuzzyFinderAdapterRegistry } from "../registry/fuzzy-provider.registry";
import { WorkspaceTextSearchProvider } from "./ws-text-finder/index.finder";

/**
 * Provides workspace-wide text search with dynamic querying.
 * Uses ripgrep when available and falls back to regex-based search.
 */
@FuzzyFinderAdapter({
  fuzzy: "currentFile.text",
  previewRenderer: "preview.buffer",
  dataAdapter: "textSearchAdapter",
})
export class CurrentFileTextSearchProvider implements FuzzyFinderProvider {
  public readonly supportsDynamicSearch = true;

  async querySelectableOptions() {
    return [];
  }

  async searchOnDynamicMode(query: string): Promise<any> {
    const ctx = PreContextManager.instance.getContext();
    const adapter = FuzzyFinderAdapterRegistry.instance.getAdapter<WorkspaceTextSearchProvider>("workspace.text");
    if (!query || !ctx || !adapter) return [];

    const absPath = ctx.document.uri.fsPath;
    return await adapter.searchOnDynamicMode(query, [absPath]);
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData> {
    const { filePath, lineStr } = WorkspaceTextSearchProvider.destructureIdentifier(identifier);

    try {
      const content = await FileReader.read(filePath);
      const lines = (content as string).split("\n");

      return {
        content: content as string,
        kind: "text",
        language: getLanguageIdForFile(filePath),
        metadata: {
          filePath,
          highlightLine: lineStr ? parseInt(lineStr, 10) - 1 : undefined,
          totalLines: lines.length,
        },
      };
    } catch {
      return {
        content: "Error loading file",
        kind: "text",
        language: "text",
        metadata: {},
      };
    }
  }

  async onSelect(identifier: string) {
    const parts = identifier.split(":");
    const uri = vscode.Uri.file(parts[0]);
    const pos = new vscode.Position(parseInt(parts[1]) - 1, parseInt(parts[2] || "1") - 1);

    const editor = await vscode.window.showTextDocument(uri, {
      selection: new vscode.Range(pos, pos),
    });

    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  }
}
