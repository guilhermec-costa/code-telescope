import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { BranchInfo } from "../../../../shared/exchange/branch-search";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
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

  getDisplayText(option: BranchInfo): string {
    const prefix = option.current ? "* " : "  ";
    const remote = option.remote ? ` (${option.remote})` : "";
    const displayText = `${prefix}${option.name}${remote}`;
    return `<i class="codicon codicon-git-branch file-icon sk-git-branch"></i><span class="file-path">${displayText}</span>`;
  }

  getSearchText(option: BranchInfo): string {
    return `${option.name} ${option.remote || ""}`;
  }

  getSelectionValue(option: BranchInfo): string {
    return option.name;
  }

  filterOption(option: BranchInfo, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const displayText = this.getDisplayText(option).toLowerCase();
    return displayText.includes(lowerQuery);
  }
}
