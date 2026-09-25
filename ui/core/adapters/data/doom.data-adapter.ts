import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { DoomFinderData, DoomFinderItem } from "../../../../shared/exchange/doom";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  type: "doomAdapter",
})
export class DoomDataAdapter implements IFuzzyFinderDataAdapter<DoomFinderData, DoomFinderItem> {
  typeName!: DataAdapterType;

  parseOptions(data: DoomFinderData): DoomFinderItem[] {
    return data.items;
  }

  getSearchText(option: DoomFinderItem): string {
    return `${option.name} ${option.description}`;
  }

  getHtmlWrapper(option: DoomFinderItem, highlightedContent: string): string {
    return `<i class="codicon codicon-debug-start file-icon"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: DoomFinderItem): string {
    return option.id;
  }
}
