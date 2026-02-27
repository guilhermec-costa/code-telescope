import { DataAdapterType } from "../../../../shared/adapters-namespace";
import type { ExtensionData, ExtensionFinderData } from "../../../../shared/exchange/extension";
import { type IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface ExtensionOption {
  index: number;
  extension: ExtensionData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "extensionsAdapter",
})
export class ExtensionsFinderDataAdapter implements IFuzzyFinderDataAdapter<ExtensionFinderData, ExtensionOption> {
  typeName: DataAdapterType;

  parseOptions(data: ExtensionFinderData): ExtensionOption[] {
    const options: ExtensionOption[] = [];
    for (let i = 0; i < data.extensions.length; i++) {
      options.push({
        index: i,
        extension: data.extensions[i],
        displayText: data.displayTexts[i],
      });
    }
    return options;
  }

  getSearchText(option: ExtensionOption): string {
    const ext = option.extension;
    return `${ext.displayName} ${ext.id} ${ext.publisher} ${ext.description}`;
  }

  getHtmlWrapper(option: ExtensionOption, highlightedContent: string): string {
    const statusClass = option.extension.isActive ? "sk-active" : "sk-inactive";
    return `<i class="codicon codicon-extensions file-icon ${statusClass}"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: ExtensionOption): string {
    return option.index.toString();
  }

  filterOption(option: ExtensionOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const ext = option.extension;
    return (
      ext.displayName.toLowerCase().includes(lowerQuery) ||
      ext.id.toLowerCase().includes(lowerQuery) ||
      ext.publisher.toLowerCase().includes(lowerQuery) ||
      ext.description.toLowerCase().includes(lowerQuery)
    );
  }
}
