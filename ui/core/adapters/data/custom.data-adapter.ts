import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";

export interface SerializedConfig {
  fuzzyAdapterType: CustomFinderDefinition["fuzzyAdapterType"];
  previewAdapterType: CustomFinderDefinition["previewAdapterType"];
  dataAdapter: CustomFinderDefinition["ui"]["dataAdapter"];
}

export class CustomDataAdapterProxy implements IFuzzyFinderDataAdapter {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

  constructor(serializedConfig: SerializedConfig) {
    const adapter = serializedConfig.dataAdapter;
    this.parseOptions = eval(`(${adapter.parseOptions})`);
    this.getDisplayText = eval(`(${adapter.getDisplayText})`);
    this.getSelectionValue = eval(`(${adapter.getSelectionValue})`);
    if (adapter.filterOption) {
      this.filterOption = eval(`(${adapter.filterOption})`);
    }
    this.fuzzyAdapterType = serializedConfig.fuzzyAdapterType as any;
    this.previewAdapterType = serializedConfig.previewAdapterType as any;
  }

  parseOptions!: (data: any) => string[];
  getDisplayText!: (option: string) => string;
  getSelectionValue!: (option: string) => string;
  filterOption?: (option: string, query: string) => boolean;
  debounceSearchTime?: number;
}
