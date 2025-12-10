import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../decorators/fuzzy-adapter.decorator";

interface CommitData {
  commits: CommitInfo[];
}

interface CommitInfo {
  hash: string;
  message: string;
  fullMessage: string;
  author: string;
  authorEmail: string;
  date: string;
  parents: string[];
}

@FuzzyFinderDataAdapter({
  fuzzy: "git.commits",
  preview: "preview.commitDiff",
})
export class GitCommitFinderDataAdapter implements IFuzzyFinderDataAdapter<CommitData, CommitInfo> {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

  parseOptions(data: CommitData): CommitInfo[] {
    return data.commits;
  }

  getDisplayText(option: CommitInfo): string {
    const shortHash = option.hash.substring(0, 7);
    const relativeDate = this.getRelativeDate(option.date);
    return `${shortHash} ${option.message} (${option.author}, ${relativeDate})`;
  }

  getSelectionValue(option: CommitInfo): string {
    return option.hash;
  }

  filterOption(option: CommitInfo, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return (
      option.hash.toLowerCase().includes(lowerQuery) ||
      option.message.toLowerCase().includes(lowerQuery) ||
      option.author.toLowerCase().includes(lowerQuery)
    );
  }

  getPreviewData(option: CommitInfo): string {
    return option.hash;
  }

  private getRelativeDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes < 1) return "just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    } catch {
      return dateString;
    }
  }
}
