import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { HighlightedCodePreviewData } from "../../../../shared/extension-webview-protocol";
import { guessLanguageIdFromPath } from "../../../utils/files";
import { IFuzzyFinderProvider } from "../../abstractions/fuzzy-finder.provider";
import { FileReader } from "../../common/cache/file-reader";
import { FuzzyFinderAdapter } from "../../decorators/fuzzy-finder-provider.decorator";
import { RegexFinder } from "./regex-finder";
import { RipgrepFinder } from "./ripgrep-finder";

/**
 * Provides workspace-wide text search with dynamic querying.
 * Uses ripgrep when available and falls back to regex-based search.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.text",
  previewRenderer: "preview.codeHighlighted",
})
export class WorkspaceTextSearchProvider implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  public readonly supportsDynamicSearch = true;
  private readonly regexFinder: RegexFinder;
  private readonly ripgrepFinder: RipgrepFinder;

  constructor() {
    this.regexFinder = new RegexFinder();
    this.ripgrepFinder = new RipgrepFinder();
  }

  async querySelectableOptions() {
    return { results: [], query: "", message: "Type to search..." };
  }

  /**
   * Performs a dynamic search as the user types.
   * Prefers ripgrep and falls back to regex search on failure.
   */
  async searchOnDynamicMode(query: string, customPaths?: string[]): Promise<any> {
    if (!query || query.trim().length < 2) {
      return { results: [], query };
    }

    if (this.ripgrepFinder.ripgrepAvailable) {
      try {
        return await this.ripgrepFinder.search(query, customPaths);
      } catch (error) {
        console.error("ripgrep search failed, falling back:", error);
        return await this.regexFinder.search(query);
      }
    } else {
      return await this.regexFinder.search(query);
    }
  }

  destructureIdentifier(identifier: string) {
    const parts = identifier.split("||");

    const filePath = parts[0];
    const lineStr = parts[1];
    const colStr = parts[2] || "1";

    return {
      filePath,
      lineStr,
      colStr,
    };
  }

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const { filePath, lineStr } = this.destructureIdentifier(identifier);

    try {
      const content = await FileReader.read(filePath);
      const lines = (content as string).split("\n");

      return {
        content: {
          kind: "text",
          path: filePath,
          text: content as string,
        },
        language: guessLanguageIdFromPath(filePath),
        metadata: {
          filePath,
          highlightLine: lineStr ? parseInt(lineStr, 10) - 1 : undefined,
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
    const { filePath, lineStr, colStr } = this.destructureIdentifier(identifier);
    const uri = vscode.Uri.file(filePath);
    const pos = new vscode.Position(parseInt(lineStr, 10) - 1, parseInt(colStr, 10) - 1);

    try {
      const editor = await vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(pos, pos),
      });
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    } catch (err) {
      console.error("Erro ao abrir arquivo:", err);
    }
  }
}
