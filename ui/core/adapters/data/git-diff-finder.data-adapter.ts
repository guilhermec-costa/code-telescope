import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { GitDiffInfo } from "../../../../shared/exchange/git-diff";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  type: "gitDiffsAdapter",
})
export class GitDiffFinderDataAdapter implements IFuzzyFinderDataAdapter<GitDiffInfo[], GitDiffInfo> {
  typeName!: DataAdapterType;

  parseOptions(data: GitDiffInfo[]): GitDiffInfo[] {
    return data;
  }

  getSearchText(option: GitDiffInfo): string {
    return `${option.kind} ${option.status} ${option.relativePath}`;
  }

  getHtmlWrapper(option: GitDiffInfo, highlightedContent: string): string {
    const statusClass = this.getStatusClass(option.status);
    const kindTag = option.kind === "staged" ? `<span class="sk-git-diff-meta">staged</span>` : "";
    const displayPath = this.getDisplayPath(option, highlightedContent);
    const repoTag = option.repoName ? `<span class="sk-repo-tag">${option.repoName}</span>` : "";

    return `
      <span class="sk-git-diff-status ${statusClass}">${option.status}</span>
      <span class="file-path">${displayPath}</span>
      ${kindTag}
      ${repoTag}
    `;
  }

  getSelectionValue(option: GitDiffInfo): GitDiffInfo {
    return option;
  }

  private getStatusClass(status: string): string {
    if (status === "??" || status.startsWith("A")) return "sk-git-diff-status--added";
    if (status.startsWith("D")) return "sk-git-diff-status--removed";
    if (status.startsWith("R")) return "sk-git-diff-status--renamed";
    return "sk-git-diff-status--modified";
  }

  private getDisplayPath(option: GitDiffInfo, highlightedContent: string): string {
    const prefix = `${option.kind} ${option.status} `;
    return highlightedContent.startsWith(prefix) ? highlightedContent.slice(prefix.length) : highlightedContent;
  }
}
