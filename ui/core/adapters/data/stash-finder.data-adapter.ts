import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { StashInfo } from "../../../../shared/exchange/stash";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  type: "gitStashesAdapter",
})
export class GitStashDataAdapter implements IFuzzyFinderDataAdapter<StashInfo[], StashInfo> {
  typeName!: DataAdapterType;

  parseOptions(data: StashInfo[]): StashInfo[] {
    return data;
  }

  getSearchText(option: StashInfo): string {
    return `stash@{${option.index}} ${option.message}`;
  }

  getHtmlWrapper(option: StashInfo, highlightedContent: string): string {
    const spaceIndex = highlightedContent.indexOf(" ");
    const refPart = spaceIndex !== -1 ? highlightedContent.slice(0, spaceIndex) : highlightedContent;
    const messagePart = spaceIndex !== -1 ? highlightedContent.slice(spaceIndex + 1) : "";

    const repoTag = option.repoName ? `<span class="sk-repo-tag">${option.repoName}</span>` : "";

    return `
      <i class="codicon codicon-git-stash file-icon"></i>
      <span class="sk-commit-hash">${refPart}</span>
      <span class="file-path">${messagePart}</span>
      ${repoTag}
    `;
  }

  getSelectionValue(option: StashInfo): StashInfo {
    return option;
  }
}
