import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { WorkspaceSymbolData, WorkspaceSymbolFinderData } from "../../../../shared/exchange/ws-symbols";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface WorkspaceSymbolOption {
  index: number;
  symbol: WorkspaceSymbolData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.symbols",
  preview: "preview.codeHighlighted",
})
export class WorkspaceSymbolsFinderDataAdapter
  implements IFuzzyFinderDataAdapter<WorkspaceSymbolFinderData, WorkspaceSymbolOption>
{
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

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

  getDisplayText(option: WorkspaceSymbolOption): string {
    const codicon = option.symbol.codicon;
    return `<i class="codicon codicon-${codicon} file-icon sk-${codicon}"></i><span class="file-path">${option.displayText}</span>`;
  }

  getSelectionValue(option: WorkspaceSymbolOption): string {
    return option.index.toString();
  }

  filterOption(option: WorkspaceSymbolOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const symbol = option.symbol;

    return (
      symbol.name.toLowerCase().includes(lowerQuery) ||
      (symbol.containerName?.toLowerCase().includes(lowerQuery) ?? false) ||
      symbol.kindName.toLowerCase().includes(lowerQuery)
    );
  }
}
