import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CallHierarchyData, CallHierarchyFinderData } from "../../../../shared/exchange/call-hierarchy";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface CallHierarchyOption {
  index: number;
  call: CallHierarchyData;
  codicon: string;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.callHierarchy",
  preview: "preview.codeHighlighted",
})
export class CallHierarchyFinderDataAdapter
  implements IFuzzyFinderDataAdapter<CallHierarchyFinderData, CallHierarchyOption>
{
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

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

  getDisplayText(option: CallHierarchyOption): string {
    const codicon = option.codicon;
    let directionCodicon = option.call.type === "incoming" ? "call-incoming" : "call-outgoing";
    return `<i class="codicon codicon-${codicon} file-icon sk-${codicon}"></i><i class="codicon codicon-${directionCodicon} file-icon sk-${codicon}"></i><span class="file-path">${option.displayText}</span>`;
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
