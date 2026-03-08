import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";

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
      this.getHtmlWrapper = (_option: any, content: string) => `<span class="file-path">${content}</span>`;
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
