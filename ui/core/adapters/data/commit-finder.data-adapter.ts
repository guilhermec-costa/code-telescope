import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { CommitSearchInfo } from "../../../../shared/exchange/commit-search";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  type: "gitCommitsAdapter",
})
export class CommitFinderDataAdapter implements IFuzzyFinderDataAdapter<CommitSearchInfo[], CommitSearchInfo> {
  typeName: DataAdapterType;
  debounceSearchTime = 30;
  shouldSort = false;

  parseOptions(data: CommitSearchInfo[]) {
    return data;
  }

  getSearchText(option: CommitSearchInfo): string {
    return `${option.hash.slice(0, 9)} ${option.message}`;
  }

  getHtmlWrapper(option: CommitSearchInfo, highlightedContent: string): string {
    return `<i class="codicon codicon-git-commit file-icon"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: CommitSearchInfo): string {
    return option.hash;
  }
}
