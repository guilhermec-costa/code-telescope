import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";

/**
 * Represents a provider responsible for supplying data and behavior to the fuzzy finder
 */
export interface IFuzzyFinderProvider {
  /**
   * Identifies which fuzzy search provider (engine/strategy) this
   * implementation belongs to.
   */
  fuzzyAdapterType: FuzzyProviderType;

  /**
   * Specifies which preview adapter should visually render the preview
   * area for items handled by this provider.
   */
  previewAdapterType: PreviewRendererType;
  /**
   * Returns the list of items to be displayed in the fuzzy finder.
   * Example: files, branches, symbols, commands...
   */
  querySelectableOptions(): Promise<any>;

  /**
   * Triggered when the user selects an item (Enter).
   */
  onSelect(item: string): void | Promise<void>;

  getHtmlLoadConfig(): HtmlLoadConfig;

  getPreviewData(identifier: string): Promise<PreviewData>;

  supportsDynamicSearch?: boolean;
  /**
   * Optional: dynamic search based on user's query
   * It's only called when supportsDynamicSearch is true.
   */
  searchOptions?(query: string): Promise<any>;
}

export type HtmlLoadConfig = {
  fileName: string;
  placeholders: Record<string, string>;
};
