import { CommitSearchInfo } from "../../../../shared/exchange/commit-search";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { API } from "../../../@types/git";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";
import { getGitApi } from "./api-utils";

@FuzzyFinderAdapter({
  fuzzy: "git.commits",
  previewRenderer: "preview.buffer",
  dataAdapter: "gitCommitsAdapter",
  name: "Git Commits",
  description: "Search and view Git commit history",
})
export class GitCommitFuzzyFinder implements FuzzyFinderProvider {
  private gitApi: API | null = null;

  onSelect(item: string): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

  private async ensureGitLoading() {
    if (this.gitApi) return;
    this.gitApi = await getGitApi();
  }

  async querySelectableOptions(): Promise<CommitSearchInfo[]> {
    await this.ensureGitLoading();
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

  async getPreviewData(hash: string): Promise<TextPreviewData> {
    await this.ensureGitLoading();
    if (!this.gitApi) {
      return { kind: "text", content: "" };
    }

    const repo = this.gitApi.repositories[0];
    if (!repo) {
      return { kind: "text", content: "" };
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
      content: diff,
      kind: "text",
      language: "diff",
    };
  }
}
