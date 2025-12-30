import * as path from "path";
import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { HighlightedCodePreviewData } from "../../../../shared/extension-webview-protocol";
import { IFuzzyFinderProvider } from "../../abstractions/fuzzy-finder.provider";
import { FileContentCache } from "../../common/cache/file-content.cache";
import { HighlightContentCache } from "../../common/cache/highlight-content.cache";
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
  async searchOnDynamicMode(query: string): Promise<any> {
    if (!query || query.trim().length < 2) {
      return { results: [], query };
    }

    if (this.ripgrepFinder.ripgrepAvailable) {
      try {
        return await this.ripgrepFinder.search(query);
      } catch (error) {
        console.error("ripgrep search failed, falling back:", error);
        return await this.regexFinder.search(query);
      }
    } else {
      return await this.regexFinder.search(query);
    }
  }

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const [filePath, line] = identifier.split(":");
    const language = path.extname(filePath).slice(1) || "text";

    const highlightLine = line ? parseInt(line, 10) - 1 : undefined;

    const cachedHighlightedContent = HighlightContentCache.instance.get(`${filePath}:${highlightLine}`);
    if (cachedHighlightedContent) {
      return {
        content: {
          path: filePath,
          text: cachedHighlightedContent,
          isCached: true,
        },
        language,
        metadata: {
          filePath,
          highlightLine,
        },
      };
    }

    try {
      const content = await FileContentCache.instance.get(filePath);
      const lines = content.split("\n");

      return {
        content: {
          path: filePath,
          text: content,
          isCached: false,
        },
        language,
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
          text: "Error loading file",
          isCached: false,
        },
        language: "text",
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
