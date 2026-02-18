import { CommitSearchInfo } from "../../../../shared/exchange/commit-search";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";
import { getGitApi } from "./api-utils";

@FuzzyFinderAdapter({
  fuzzy: "git.commits",
  previewRenderer: "preview.buffer",
  dataAdapter: "gitCommitsAdapter",
})
export class GitCommitFuzzyFinder implements FuzzyFinderProvider {
  private readonly gitApi = getGitApi();

  onSelect(item: string): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

  async querySelectableOptions(): Promise<CommitSearchInfo[]> {
    const commits = await this.findCommitsFromCurrentBranch();
    return commits.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.authorName || "",
      date: commit.authorDate?.toISOString() || "",
    }));
  }

  public async findCommitsFromCurrentBranch() {
    if (!this.gitApi) return [];
    const repo = this.gitApi.repositories[0];
    if (!repo) return [];

    const currentBranch = repo.state.HEAD;
    if (!currentBranch?.name) return [];

    const log = await repo.log({ refNames: [currentBranch.name], maxEntries: 500 });
    return log;
  }

  async getPreviewData(hash: string): Promise<PreviewData<any>> {
    if (!this.gitApi) {
      return { content: { hash, message: "", author: "", date: "", diff: "" } };
    }

    const repo = this.gitApi.repositories[0];
    if (!repo) {
      return { content: { hash, message: "", author: "", date: "", diff: "" } };
    }

    let diff = "";

    try {
      const parentHash = hash + "~1";
      const changes = await repo.diffBetween(parentHash, hash);

      const diffParts: string[] = [];

      for (const change of changes) {
        const filePath = change.uri.fsPath;
        const fileDiff = await repo.diffWith(parentHash, filePath);
        if (fileDiff) {
          diffParts.push(fileDiff);
        }
      }

      diff = diffParts.join("\n");
    } catch (e) {
      console.error("Error getting commit diff:", e);
      diff = "";
    }

    return {
      content: {
        kind: "text",
        text: diff as string,
      },
      language: "diff",
    };
  }
}
