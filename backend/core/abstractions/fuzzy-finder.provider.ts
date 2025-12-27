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

  /**
   * Provides configuration required to load the HTML
   * used by the fuzzy finder webview.
   *
   * This allows providers to inject custom HTML files
   * and replace placeholders dynamically.
   */
  getHtmlLoadConfig(): HtmlLoadConfig;

  /**
   * Returns the data necessary to render the preview
   * for a given item.
   */
  getPreviewData(identifier: string): Promise<PreviewData>;

  /**
   * Indicates whether this provider supports dynamic search.
   *
   * When enabled, the fuzzy finder will call `searchOnDynamicMode`
   * on each query change instead of filtering locally.
   */
  supportsDynamicSearch?: boolean;

  /**
   * Optional: dynamic search based on user's query
   * It's only called when supportsDynamicSearch is true.
   */
  searchOnDynamicMode?(query: string): Promise<any>;
}

/**
 * Configuration used to load and hydrate the fuzzy finder HTML.
 */
export type HtmlLoadConfig = {
  /**
   * Name of the HTML file to be loaded.
   */
  fileName: string;

  /**
   * Key-value map used to replace placeholders
   * inside the HTML template.
   */
  placeholders: Record<string, string>;
};
