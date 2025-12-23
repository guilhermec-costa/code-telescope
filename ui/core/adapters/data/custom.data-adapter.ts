import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";

export interface SerializedUiConfig {
  fuzzyAdapterType: CustomFinderDefinition["fuzzyAdapterType"];
  previewAdapterType: CustomFinderDefinition["previewAdapterType"];
  dataAdapter: CustomFinderDefinition["ui"]["dataAdapter"];
}

export class CustomDataAdapterProxy implements IFuzzyFinderDataAdapter {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

  constructor(serializedConfig: SerializedUiConfig) {
    const adapter = serializedConfig.dataAdapter;

    this.parseOptions = indirectEval(`(${adapter.parseOptions})`);
    this.getDisplayText = indirectEval(`(${adapter.getDisplayText})`);
    this.getSelectionValue = indirectEval(`(${adapter.getSelectionValue})`);

    if (adapter.filterOption) {
      this.filterOption = indirectEval(`(${adapter.filterOption})`);
    }

    this.fuzzyAdapterType = serializedConfig.fuzzyAdapterType as any;
    this.previewAdapterType = serializedConfig.previewAdapterType as any;
  }

  parseOptions!: (options: any) => string[];
  getDisplayText!: (option: string) => string;
  getSelectionValue!: (option: string) => string;
  filterOption?: (option: string, query: string) => boolean;
  debounceSearchTime?: number;
}

function indirectEval<T = unknown>(code: string): T {
  return (0, eval)(code);
}
