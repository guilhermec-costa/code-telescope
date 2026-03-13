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
    const remote = option.remote ? `(remote)` : "";
    return `${option.name} ${remote}`.trim();
  }

  getHtmlWrapper(option: BranchInfo, highlightedContent: string): string {
    const isRemote = option.remote;
    const isCurrent = option.current;

    const branchIcon = isRemote ? "codicon-cloud" : "codicon-git-branch";
    const currentIndicator = isCurrent
      ? `<span class="sk-branch-current"><i class="codicon codicon-check"></i></span>`
      : "";
    const repoTag = option.repoName ? `<span class="sk-repo-tag">${option.repoName}</span>` : "";

    return `
    <i class="codicon ${branchIcon} file-icon"></i>
    <span class="file-path">${highlightedContent}</span>
    ${repoTag}
    ${currentIndicator}
  `;
  }

  getSelectionValue(option: BranchInfo): BranchInfo {
    return option;
  }
}
