import * as vscode from "vscode";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { ChunkableProvider } from "../../abstractions/chunkable-provider";
import { FileReader } from "../../common/file-reader";
import { RipgrepTextFinder } from "../../common/rg/rg-text-finder";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";
import { RegexFinder } from "./regex-finder";

/**
 * Provides workspace-wide text search with dynamic querying.
 * Uses ripgrep when available and falls back to regex-based search.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.text",
  previewRenderer: "preview.buffer",
  dataAdapter: "textSearchAdapter",
  name: "Search in Workspace",
  description: "Search for text across the entire workspace",
})
export class WorkspaceTextSearchProvider implements FuzzyFinderProvider, ChunkableProvider<{ results: any }> {
  public readonly supportsDynamicSearch = true;
  private readonly regexFinder: RegexFinder;
  private readonly ripgrepFinder: RipgrepTextFinder;
  public readonly chunkSize: number = 3500;
  public readonly concurrency = 16;

  usePreSelection = true;

  constructor() {
    this.regexFinder = new RegexFinder();
    this.ripgrepFinder = new RipgrepTextFinder();
  }

  async querySelectableOptions() {
    return [];
  }

  public mapChunk(chunk: any[]) {
    return {
      results: chunk,
    };
  }

  /**
   * Performs a dynamic search as the user types, streaming the results via generator.
   * Prefers ripgrep and falls back to regex search on failure.
   */
  async *searchOnDynamicModeStream(query: string, customPaths?: string[], signal?: AbortSignal): AsyncGenerator<any[]> {
    if (!query) return;

    if (this.ripgrepFinder.ripgrepAvailable) {
      try {
        yield* this.ripgrepFinder.searchStream(query, customPaths, signal);
        return;
      } catch (error) {
        if (signal?.aborted) return;
        console.error("ripgrep stream failed, falling back:", error);
      }
    }

    const result = await this.regexFinder.search(query);
    if (signal?.aborted) return;
    if (result.results?.length > 0) yield result.results;
  }

  /**
   * Performs a dynamic search as the user types.
   * Prefers ripgrep and falls back to regex search on failure.
   */
  async searchOnDynamicMode(query: string, customPaths?: string[]): Promise<any> {
    if (!query) return [];

    let searchResult;
    if (this.ripgrepFinder.ripgrepAvailable) {
      try {
        searchResult = await this.ripgrepFinder.search(query, customPaths);
      } catch (error) {
        console.error("ripgrep search failed, falling back:", error);
        searchResult = await this.regexFinder.search(query);
      }
    } else {
      searchResult = await this.regexFinder.search(query);
    }

    const allMatches = searchResult.results;

    return {
      results: allMatches,
      query,
    };
  }

  static destructureIdentifier(identifier: string) {
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

  async getPreviewData(identifier: string): Promise<TextPreviewData> {
    const { filePath, lineStr } = WorkspaceTextSearchProvider.destructureIdentifier(identifier);

    try {
      const content = await FileReader.read(filePath);
      const lines = (content as string).split("\n");

      return {
        content: content as string,
        kind: "text",
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
        metadata: {},
      };
    }
  }

  async onSelect(identifier: string) {
    const { filePath, lineStr, colStr } = WorkspaceTextSearchProvider.destructureIdentifier(identifier);
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
