import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { BuiltinFinderData, BuiltinFinderItem } from "../../../../shared/exchange/builtin";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface BuiltinFinderOption {
  index: number;
  item: BuiltinFinderItem;
}

@FuzzyFinderDataAdapter({
  type: "builtinFindersAdapter",
})
export class BuiltinFinderDataAdapter implements IFuzzyFinderDataAdapter<BuiltinFinderData, BuiltinFinderOption> {
  typeName: DataAdapterType;

  parseOptions(data: BuiltinFinderData): BuiltinFinderOption[] {
    const options: BuiltinFinderOption[] = [];

    for (let i = 0; i < data.items.length; i++) {
      options.push({
        index: i,
        item: data.items[i],
      });
    }

    return options;
  }

  getSearchText(option: BuiltinFinderOption): string {
    return `${option.item.name}`;
  }

  getHtmlWrapper(option: BuiltinFinderOption, highlightedContent: string): string {
    return `<i class="codicon codicon-telescope file-icon"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: BuiltinFinderOption): string {
    return option.index.toString();
  }
}
