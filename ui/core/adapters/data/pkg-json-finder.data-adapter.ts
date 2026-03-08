import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { PackageData, PackageDocFinderData } from "../../../../shared/exchange/pkg-json";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface PackageDocOption {
  index: number;
  package: PackageData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "packageDocsAdapter",
})
export class PackageDocsFinderDataAdapter implements IFuzzyFinderDataAdapter<PackageDocFinderData, PackageDocOption> {
  typeName: DataAdapterType;

  parseOptions(data: PackageDocFinderData): PackageDocOption[] {
    const options: PackageDocOption[] = [];
    for (let i = 0; i < data.packages.length; i++) {
      options.push({
        index: i,
        package: data.packages[i],
        displayText: data.displayTexts[i],
      });
    }
    return options;
  }

  getSearchText(option: PackageDocOption): string {
    return `${option.package.name} v${option.package.version}`;
  }

  getHtmlWrapper(option: PackageDocOption, highlightedContent: string): string {
    const codicon = option.package.isDev ? "tools" : "package";
    const cssClass = option.package.isDev ? "sk-dev" : "sk-dep";
    return `<i class="codicon codicon-${codicon} file-icon ${cssClass}"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: PackageDocOption): string {
    return option.index.toString();
  }
}
