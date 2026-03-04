import { PreContextManager } from "../common/pre-context";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";
import { WorkspaceTextSearchProvider } from "./ws-text-finder/index.finder";

@FuzzyFinderAdapter({
  fuzzy: "currentFile.text",
  previewRenderer: "preview.buffer",
  dataAdapter: "textSearchAdapter",
  name: "Search in File",
  description: "Search for text in the current file",
})
export class CurrentFileTextSearchProvider extends WorkspaceTextSearchProvider {
  async searchOnDynamicMode(query: string): Promise<any> {
    const ctx = PreContextManager.instance.getContext();
    if (!query || !ctx) return { results: [], query };

    const absPath = ctx.document.uri.fsPath;
    return await super.searchOnDynamicMode(query, [absPath]);
  }

  async *searchOnDynamicModeStream(query: string) {
    const ctx = PreContextManager.instance.getContext();
    if (!query || !ctx) return;

    const absPath = ctx.document.uri.fsPath;
    yield* super.searchOnDynamicModeStream(query, [absPath]);
  }
}
