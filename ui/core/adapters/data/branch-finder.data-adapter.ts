import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { BranchInfo } from "../../../../shared/exchange/branch-search";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  type: "gitBranchesAdapter",
})
export class BranchFinderDataAdapter implements IFuzzyFinderDataAdapter<BranchInfo[], BranchInfo> {
  typeName: DataAdapterType;
  debounceSearchTime = 30;

  parseOptions(data: BranchInfo[]) {
    return data;
  }

  getSearchText(option: BranchInfo): string {
    const remote = option.remote ? `(${option.remote})` : "";
    return `${option.name} ${remote}`;
  }

  getHtmlWrapper(option: BranchInfo, highlightedContent: string): string {
    return `<i class="codicon codicon-git-branch file-icon sk-git-branch"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: BranchInfo): string {
    return option.name;
  }
}
