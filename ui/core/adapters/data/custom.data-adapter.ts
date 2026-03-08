import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { formatFileOptionHtml } from "../../../utils/html";
import { getSvgIconUrl } from "../../../utils/icon";

export interface SerializedUiConfig {
  fuzzyAdapterType: CustomFinderDefinition["fuzzyAdapterType"];
  dataAdapterType: DataAdapterType;
  dataAdapter: CustomFinderDefinition["ui"]["dataAdapter"];
}

export class CustomDataAdapterProxy implements IFuzzyFinderDataAdapter {
  typeName: DataAdapterType;

  constructor(serializedConfig: SerializedUiConfig) {
    const adapter = serializedConfig.dataAdapter as any;

    this.parseOptions = indirectEval(`(${adapter.parseOptions})`);
    this.getSelectionValue = indirectEval(`(${adapter.getSelectionValue})`);

    if (adapter.getSearchText) {
      this.getSearchText = indirectEval(`(${adapter.getSearchText})`);
    } else {
      throw new Error("getSearchText is required for custom adapters");
    }

    if (adapter.htmlWrapperPreset === "file-icon") {
      this.getHtmlWrapper = (option, highlighted) => {
        const filePath = this.getSearchText(option);
        return formatFileOptionHtml(getSvgIconUrl(filePath), highlighted);
      };
    } else if (adapter.htmlWrapperPreset === "codicon") {
      const getCodiconName: (option: any) => string = adapter.getCodiconName
        ? indirectEval(`(${adapter.getCodiconName})`)
        : () => "circle-outline";
      this.getHtmlWrapper = (option, highlighted) => {
        const icon = getCodiconName(option);
        return `<i class="codicon codicon-${icon} file-icon"></i><span class="file-path">${highlighted}</span>`;
      };
    } else if (adapter.getHtmlWrapper) {
      this.getHtmlWrapper = indirectEval(`(${adapter.getHtmlWrapper})`);
    } else {
      this.getHtmlWrapper = (_option, highlighted) => `<span>${highlighted}</span>`;
    }

    this.typeName = serializedConfig.dataAdapterType;
  }

  parseOptions!: (options: any) => string[];
  getSearchText!: (option: string) => string;
  getHtmlWrapper!: (option: string, highlightedContent: string) => string;
  getSelectionValue!: (option: string) => string;
  debounceSearchTime?: number;
}

function indirectEval<T = unknown>(code: string): T {
  return (0, eval)(code);
}
