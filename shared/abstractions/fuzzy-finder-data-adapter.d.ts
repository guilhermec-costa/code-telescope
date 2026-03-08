import { DataAdapterType } from "../adapters-namespace";

/**
 * Defines how a specific finder mode should transform, display and filter data.
 */
export interface IFuzzyFinderDataAdapter<TData = any, TOption = string> {
  /**
   * Defines which fuzzy search provider this adapter uses.
   * This allows different finder modes to use different matching strategies.
   */
  typeName: DataAdapterType;

  /**
   * Converts the raw data received from the extension into a list of displayable options.
   *
   * @param data Raw payload sent from the backend/extension.
   * @returns Array of options that the UI will render and allow the user to select.
   */
  parseOptions(data: TData): TOption[];

  /**
   * Returns the searchable text representation of an option.
   *
   * This value is used by the fuzzy engine to perform matching.
   * It should contain only raw, searchable content (no markup).
   *
   * @param option The option to extract searchable text from.
   */
  getSearchText(option: TOption): string;

  /**
   * Wraps the highlighted content with the appropriate HTML structure.
   *
   * @param option The option to wrap.
   * @param highlightedContent The content with highlight spans already applied.
   */
  getHtmlWrapper(option: TOption, highlightedContent: string): string;

  /**
   * Returns the human-readable label for a specific option.
   *
   * This text is shown inside the option list.
   *
   * @param option The option to format.
   */
  getSelectionValue(option: TOption): any;

  calcHlOffsetChars?(option: TOption): number;
  /**
   * Custom filter logic for a single option
   */
  filterOption(option: TOption, query: string): boolean;

  sortFn?(x1: TOption, x2: TOption): number;

  shouldSort?: boolean;

  debounceSearchTime?: number;
}
