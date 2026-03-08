import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { CallHierarchyData, CallHierarchyFinderData } from "../../../../shared/exchange/call-hierarchy";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface CallHierarchyOption {
  index: number;
  call: CallHierarchyData;
  codicon: string;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "workspaceCallHierarchyAdapter",
})
export class CallHierarchyFinderDataAdapter
  implements IFuzzyFinderDataAdapter<CallHierarchyFinderData, CallHierarchyOption>
{
  typeName!: DataAdapterType;

  parseOptions(data: CallHierarchyFinderData): CallHierarchyOption[] {
    const options: CallHierarchyOption[] = [];

    for (let i = 0; i < data.calls.length; i++) {
      options.push({
        index: i,
        codicon: data.codicons[i],
        call: data.calls[i],
        displayText: data.displayTexts[i],
      });
    }

    return options;
  }

  getSearchText(option: CallHierarchyOption): string {
    const call = option.call;
    const container = call.containerName ? `(${call.containerName})` : "";
    return `${call.name} ${container} ${call.relativePath}`;
  }

  getHtmlWrapper(option: CallHierarchyOption, highlightedContent: string): string {
    const codicon = option.codicon;
    let directionCodicon = option.call.type === "incoming" ? "call-incoming" : "call-outgoing";
    return `<i class="codicon codicon-${codicon} file-icon sk-${codicon}"></i><i class="codicon codicon-${directionCodicon} file-icon sk-${codicon}"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: CallHierarchyOption): string {
    return option.index.toString();
  }

  filterOption(option: CallHierarchyOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const call = option.call;

    return (
      call.name.toLowerCase().includes(lowerQuery) ||
      call.detail.toLowerCase().includes(lowerQuery) ||
      call.relativePath.toLowerCase().includes(lowerQuery) ||
      (call.containerName?.toLowerCase().includes(lowerQuery) ?? false) ||
      call.type.includes(lowerQuery)
    );
  }
}
