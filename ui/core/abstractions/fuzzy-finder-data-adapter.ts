import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";

/**
 * Defines how a specific finder mode should transform, display and filter data.
 */
export interface IFuzzyFinderDataAdapter<TData = any, TOption = string> {
  /**
   * Type of the preview renderer that should be used for this adapter.
   * Determines how the preview area will interpret and display the selected option.
   */
  previewAdapterType: PreviewRendererType;

  /**
   * Defines which fuzzy search provider this adapter uses.
   * This allows different finder modes to use different matching strategies.
   */
  fuzzyAdapterType: FuzzyProviderType;

  /**
   * Converts the raw data received from the extension into a list of displayable options.
   *
   * @param data Raw payload sent from the backend/extension.
   * @returns Array of options that the UI will render and allow the user to select.
   */
  parseOptions(data: TData): TOption[];

  /**
   * Returns the human-readable label for a specific option.
   *
   * This text is shown inside the option list.
   *
   * @param option The option to format.
   */
  getDisplayText(option: TOption): string;

  /**
   * Returns the human-readable label for a specific option.
   *
   * This text is shown inside the option list.
   *
   * @param option The option to format.
   */
  getSelectionValue(option: TOption): string;

  /**
   * Custom filter logic for a single option
   */
  filterOption(option: TOption, query: string): boolean;

  debounceSearchTime?: number;
}
