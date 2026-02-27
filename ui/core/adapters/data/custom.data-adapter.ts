import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";

export interface SerializedUiConfig {
  fuzzyAdapterType: CustomFinderDefinition["fuzzyAdapterType"];
  dataAdapterType: DataAdapterType;
  dataAdapter: CustomFinderDefinition["ui"]["dataAdapter"];
}

export class CustomDataAdapterProxy implements IFuzzyFinderDataAdapter {
  typeName: DataAdapterType;

  constructor(serializedConfig: SerializedUiConfig) {
    const adapter = serializedConfig.dataAdapter;

    this.parseOptions = indirectEval(`(${adapter.parseOptions})`);
    this.getSelectionValue = indirectEval(`(${adapter.getSelectionValue})`);

    if (adapter.getSearchText) {
      this.getSearchText = indirectEval(`(${adapter.getSearchText})`);
    } else {
      throw new Error("getSearchText is required for custom adapters");
    }

    if (adapter.getHtmlWrapper) {
      this.getHtmlWrapper = indirectEval(`(${adapter.getHtmlWrapper})`);
    } else {
      throw new Error("getHtmlWrapper is required for custom adapters");
    }

    if (adapter.filterOption) {
      this.filterOption = indirectEval(`(${adapter.filterOption})`);
    }

    this.typeName = serializedConfig.dataAdapterType;
  }

  parseOptions!: (options: any) => string[];
  getSearchText!: (option: string) => string;
  getHtmlWrapper!: (option: string, highlightedContent: string) => string;
  getSelectionValue!: (option: string) => string;
  filterOption: (option: string, query: string) => boolean;
  debounceSearchTime?: number;
}

function indirectEval<T = unknown>(code: string): T {
  return (0, eval)(code);
}
