import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { resolvePathExt } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileReader } from "../common/cache/file-reader";
import { PreContextManager } from "../common/pre-context";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";
import { FuzzyFinderAdapterRegistry } from "../registry/fuzzy-provider.registry";
import { WorkspaceTextSearchProvider } from "./ws-text-finder/index.finder";

/**
 * Provides workspace-wide text search with dynamic querying.
 * Uses ripgrep when available and falls back to regex-based search.
 */
@FuzzyFinderAdapter({
  fuzzy: "currentFile.text",
  previewRenderer: "preview.codeHighlighted",
})
export class CurrentFileTextSearchProvider implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  public readonly supportsDynamicSearch = true;

  async querySelectableOptions() {
    return { results: [], query: "", message: "Type to search..." };
  }

  async searchOnDynamicMode(query: string): Promise<any> {
    const ctx = PreContextManager.instance.getContext();
    const adapter = FuzzyFinderAdapterRegistry.instance.getAdapter<WorkspaceTextSearchProvider>("workspace.text");
    if (!query || query.trim().length < 2 || !ctx || !adapter) {
      return { results: [], query };
    }

    const absPath = ctx.document.uri.fsPath;
    const result = await adapter.searchOnDynamicMode(query, [absPath]);
    return result;
  }

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const [filePath, line] = identifier.split(":");
    let ext = resolvePathExt(filePath);

    try {
      const content = await FileReader.read(filePath);
      const lines = (content as string).split("\n");

      return {
        content: {
          kind: "text",
          path: filePath,
          text: content as string,
        },
        language: ext,
        metadata: {
          filePath,
          highlightLine: line ? parseInt(line, 10) - 1 : undefined,
          totalLines: lines.length,
        },
      };
    } catch {
      return {
        content: {
          path: filePath,
          kind: "text",
          text: "Error loading file",
        },
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
