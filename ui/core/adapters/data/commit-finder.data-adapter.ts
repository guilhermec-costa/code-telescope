import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { CommitSearchInfo } from "../../../../shared/exchange/commit-search";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  type: "gitCommitsAdapter",
})
export class CommitFinderDataAdapter implements IFuzzyFinderDataAdapter<CommitSearchInfo[], CommitSearchInfo> {
  typeName: DataAdapterType;
  debounceSearchTime = 30;

  parseOptions(data: CommitSearchInfo[]) {
    return data;
  }

  getDisplayText(option: CommitSearchInfo): string {
    const shortHash = option.hash.substring(0, 7);
    return `<i class="codicon codicon-git-commit file-icon"></i><span class="file-path">${shortHash} - ${option.message}</span>`;
  }

  getSelectionValue(option: CommitSearchInfo): string {
    return option.hash;
  }

  filterOption(option: CommitSearchInfo, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const displayText = this.getDisplayText(option).toLowerCase();
    return displayText.includes(lowerQuery);
  }
}
