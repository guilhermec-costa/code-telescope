import * as path from "path";
import * as vscode from "vscode";
import { GitDiffInfo, GitDiffKind } from "../../../../shared/exchange/git-diff";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { execAsync } from "../../../utils/commands";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";
import { getGitRoots } from "./api-utils";

@FuzzyFinderAdapter({
  fuzzy: "git.diffs",
  previewRenderer: "preview.buffer",
  dataAdapter: "gitDiffsAdapter",
  name: "Git Diffs",
  description: "List current staged, unstaged and untracked Git changes",
})
export class GitDiffFuzzyFinder implements FuzzyFinderProvider {
  async querySelectableOptions(): Promise<GitDiffInfo[]> {
    const repos = await getGitRoots();
    if (repos.length === 0) return [];

    const showRepoName = repos.length > 1;
    const results = await Promise.allSettled(
      repos.map(async (repo) => {
        const [staged, unstaged, untracked] = await Promise.all([
          this.getDiffEntries(repo.path, "staged"),
          this.getDiffEntries(repo.path, "unstaged"),
          this.getDiffEntries(repo.path, "untracked"),
        ]);

        return [...staged, ...unstaged, ...untracked].map(
          (entry): GitDiffInfo => ({
            ...entry,
            repoPath: repo.path,
            repoName: showRepoName ? repo.name : undefined,
            absolutePath: path.join(repo.path, entry.relativePath),
          }),
        );
      }),
    );

    return results
      .filter((result): result is PromiseFulfilledResult<GitDiffInfo[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);
  }

  async onSelect(diff: GitDiffInfo): Promise<void> {
    const document = await vscode.workspace.openTextDocument(diff.absolutePath);
    await vscode.window.showTextDocument(document);
  }

  async getPreviewData(diff: GitDiffInfo): Promise<TextPreviewData> {
    try {
      const content = await this.buildDiffPreview(diff);
      return {
        content: content || "No diff available.",
        kind: "text",
        language: "diff",
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        return { content: "git not found in PATH.", kind: "text", language: "plaintext" };
      }

      console.error("[GitDiffFuzzyFinder] getPreviewData error:", e);
      return { content: "", kind: "text", language: "plaintext" };
    }
  }

  private async getDiffEntries(
    repoPath: string,
    kind: GitDiffKind,
  ): Promise<Omit<GitDiffInfo, "repoPath" | "repoName" | "absolutePath">[]> {
    const commandByKind: Record<GitDiffKind, string> = {
      staged: "git diff --cached --name-status --no-color",
      unstaged: "git diff --name-status --no-color",
      untracked: "git ls-files --others --exclude-standard",
    };

    const { stdout } = await execAsync(commandByKind[kind], { cwd: repoPath });

    if (kind === "untracked") {
      return stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((relativePath) => ({
          relativePath,
          status: "??",
          kind,
        }));
    }

    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [status, ...paths] = line.split("\t");
        const relativePath = paths[paths.length - 1];

        return {
          relativePath,
          status,
          kind,
        };
      });
  }

  private async buildDiffPreview(diff: GitDiffInfo): Promise<string> {
    const escapedPath = this.escapeShellArg(diff.relativePath);

    if (diff.kind === "staged") {
      const { stdout } = await execAsync(`git diff --cached --no-color -- ${escapedPath}`, { cwd: diff.repoPath });
      return stdout;
    }

    if (diff.kind === "unstaged") {
      const { stdout } = await execAsync(`git diff --no-color -- ${escapedPath}`, { cwd: diff.repoPath });
      return stdout;
    }

    return await this.getUntrackedDiff(diff.repoPath, escapedPath);
  }

  private async getUntrackedDiff(repoPath: string, escapedPath: string): Promise<string> {
    const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
    try {
      const { stdout } = await execAsync(`git diff --no-index --no-color -- ${nullDevice} ${escapedPath}`, {
        cwd: repoPath,
      });
      return stdout;
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stdout?: string };
      if (typeof err.stdout === "string" && err.stdout.length > 0) {
        return err.stdout;
      }
      throw error;
    }
  }

  private escapeShellArg(value: string): string {
    if (process.platform === "win32") {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return `'${value.replace(/'/g, `'\\''`)}'`;
  }
}
