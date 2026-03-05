import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import { CommitSearchInfo } from "../../../../shared/exchange/commit-search";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { API } from "../../../@types/git";
import { ExtensionConfigManager } from "../../common/config-manager";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";
import { getGitApi } from "./api-utils";

const execAsync = promisify(exec);

@FuzzyFinderAdapter({
  fuzzy: "git.commits",
  previewRenderer: "preview.buffer",
  dataAdapter: "gitCommitsAdapter",
  name: "Git Commits",
  description: "Search and view Git commit history",
})
export class GitCommitFuzzyFinder implements FuzzyFinderProvider {
  private gitApi: API | null = null;

  async onSelect(hash: string): Promise<void> {
    const repo = this.gitApi?.repositories[0];
    if (!repo) return;

    const remote = repo.state.remotes[0];
    const fetchUrl = remote?.fetchUrl ?? remote?.pushUrl;

    if (fetchUrl) {
      // transforms git@github.com:org/repo.git to https://github.com/org/repo/commit/<hash>
      const httpsUrl = fetchUrl.replace(/^git@([^:]+):/, "https://$1/").replace(/\.git$/, "");

      await vscode.env.openExternal(vscode.Uri.parse(`${httpsUrl}/commit/${hash}`));
    } else {
      await vscode.env.clipboard.writeText(hash);
      vscode.window.showInformationMessage(`Copied ${hash} to clipboard`);
    }
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
    let log = await repo.log({ maxEntries: 500, range: currentBranch.name, maxParents: 1 });

    const layout = ExtensionConfigManager.layoutCfg.mode;
    if (layout === "classic") {
      log = log.reverse();
    }
    return log;
  }

  async getPreviewData(hash: string): Promise<TextPreviewData> {
    await this.ensureGitLoading();
    if (!this.gitApi) return { kind: "text", content: "" };

    const repo = this.gitApi.repositories[0];
    if (!repo) return { kind: "text", content: "" };

    try {
      const { stdout } = await execAsync(`git show ${hash} --patch --no-color`, { cwd: repo.rootUri.fsPath });
      return { content: stdout, kind: "text", language: "diff" };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        return { content: "git not found in PATH.", kind: "text", language: "plaintext" };
      }
      console.error("Error getting commit diff:", e);
      return { kind: "text", content: "" };
    }
  }
}
