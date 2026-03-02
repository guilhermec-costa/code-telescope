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

  getSearchText(option: CommitSearchInfo): string {
    return `${option.hash.slice(0, 7)} ${option.message}`;
  }

  getHtmlWrapper(option: CommitSearchInfo, highlightedContent: string): string {
    return `<i class="codicon codicon-git-commit file-icon"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: CommitSearchInfo): string {
    return option.hash;
  }

  filterOption(option: CommitSearchInfo, query: string): boolean {
    const searchText = this.getSearchText(option).toLowerCase();
    return searchText.includes(query.toLowerCase());
  }
}
