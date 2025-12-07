import { FuzzyProviderType, PreviewRendererType } from "../../shared/adapters-namespace";
import { PreviewData } from "../../shared/extension-webview-protocol";

export interface FuzzyFinderProvider {
  readonly fuzzyAdapterType: FuzzyProviderType;
  readonly previewAdapterType: PreviewRendererType;
  /**
   * Returns the list of items to be displayed in the fuzzy finder.
   * Example: files, branches, symbols, commands...
   */
  querySelectableOptions(): Promise<any>;

  /**
   * Triggered when the user selects an item (Enter).
   * Can open a file, switch branches, execute a command...
   */
  onSelect?(item: string): void | Promise<void>;

  loadWebviewHtml(): Promise<string>;

  getPreviewData(identifier: string): Promise<PreviewData>;

  supportsDynamicSearch?: boolean;
  /**
   * Optional: dynamic search based on user's query
   * It's only called when supportsDynamicSearch is true.
   */
  searchOptions?(query: string): Promise<any>;
}
