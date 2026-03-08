import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { WorkspaceSymbolData, WorkspaceSymbolFinderData } from "../../../../shared/exchange/ws-symbols";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface WorkspaceSymbolOption {
  index: number;
  symbol: WorkspaceSymbolData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "symbolsAdapter",
})
export class SymbolsFinderDataAdapter
  implements IFuzzyFinderDataAdapter<WorkspaceSymbolFinderData, WorkspaceSymbolOption>
{
  typeName: DataAdapterType;

  parseOptions(data: WorkspaceSymbolFinderData): WorkspaceSymbolOption[] {
    const options: WorkspaceSymbolOption[] = [];

    for (let i = 0; i < data.symbols.length; i++) {
      options.push({
        index: i,
        symbol: data.symbols[i],
        displayText: data.displayTexts[i],
      });
    }

    return options;
  }

  getSearchText(option: WorkspaceSymbolOption): string {
    const symbol = option.symbol;
    return `${symbol.name} (${symbol.kindName}) ${symbol.containerName || ""}`;
  }

  getHtmlWrapper(option: WorkspaceSymbolOption, highlightedContent: string): string {
    const codicon = option.symbol.codicon;
    return `<i class="codicon codicon-${codicon} file-icon sk-${codicon}"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: WorkspaceSymbolOption): string {
    return option.index.toString();
  }
}
