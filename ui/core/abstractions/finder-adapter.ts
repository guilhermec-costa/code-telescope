import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";

export interface IFinderAdapter<TData = any, TOption = string> {
  readonly previewAdapterType: PreviewRendererType;

  readonly fuzzyAdapterType: FuzzyProviderType;

  /**
   * Processes the raw data coming from the extension
   * and returns the list of options to display
   */
  parseOptions(data: TData): TOption[];

  /**
   * Returns the display text for a given option
   */
  getDisplayText(option: TOption): string;

  /**
   * Returns the actual value to send back to the extension
   * when the option is selected
   */
  getSelectionValue(option: TOption): string;

  /**
   * Optional: Custom filter logic for a single option
   */
  filterOption?(option: TOption, query: string): boolean;
}
