import * as vscode from "vscode";
import { CommitSearchInfo } from "../../../../shared/exchange/commit-search";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { execAsync } from "../../../utils/commands";
import { ExtensionConfigManager } from "../../common/config-manager";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";
import { getGitRoots } from "./api-utils";

@FuzzyFinderAdapter({
  fuzzy: "git.commits",
  previewRenderer: "preview.buffer",
  dataAdapter: "gitCommitsAdapter",
  name: "Git Commits",
  description: "Search and view Git commit history",
})
export class GitCommitFuzzyFinder implements FuzzyFinderProvider {
  async onSelect(commit: CommitSearchInfo): Promise<void> {
    const { repoPath, hash } = commit;

    try {
      const { stdout: remoteUrl } = await execAsync("git remote get-url origin", { cwd: repoPath });
      const httpsUrl = remoteUrl
        .trim()
        .replace(/^git@([^:]+):/, "https://$1/")
        .replace(/\.git$/, "");
      await vscode.env.openExternal(vscode.Uri.parse(`${httpsUrl}/commit/${hash}`));
    } catch {
      await vscode.env.clipboard.writeText(hash);
      vscode.window.showInformationMessage(`Copied ${hash} to clipboard`);
    }
  }

  async querySelectableOptions(): Promise<CommitSearchInfo[]> {
    const repos = await getGitRoots();
    if (repos.length === 0) return [];

    const perRepo = await Promise.allSettled(
      repos.map(async (repo) => {
        const { stdout: branch } = await execAsync("git rev-parse --abbrev-ref HEAD", { cwd: repo.path });
        const currentBranch = branch.trim();
        if (!currentBranch) return [];

        const { stdout } = await execAsync(
          `git log ${currentBranch} --max-count=500 --no-merges --format="%H|%s|%an|%aI"`,
          { cwd: repo.path },
        );

        return stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [hash, message, author, date] = line.split("|");
            return {
              hash,
              message,
              author,
              date,
              repoName: repos.length > 1 ? repo.name : undefined,
              repoPath: repo.path,
            } satisfies CommitSearchInfo;
          });
      }),
    );

    let commits = perRepo
      .filter((r): r is PromiseFulfilledResult<CommitSearchInfo[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    const layout = ExtensionConfigManager.layoutCfg.mode;
    if (layout === "classic") {
      commits = commits.reverse();
    }

    return commits;
  }

  async getPreviewData(commit: CommitSearchInfo): Promise<TextPreviewData> {
    const { repoPath, hash } = commit;

    try {
      const { stdout } = await execAsync(`git show ${hash} --patch --no-color`, { cwd: repoPath });
      return { content: stdout, kind: "text", language: "diff" };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        return { content: "git not found in PATH.", kind: "text", language: "plaintext" };
      }
      console.error("[GitCommitFuzzyFinder] getPreviewData error:", e);
      return { kind: "text", content: "" };
    }
  }
}
