import * as vscode from "vscode";
import { BranchInfo, CommitInfo } from "../../../../shared/exchange/branch-search";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { execAsync } from "../../../utils/commands";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";
import { getGitRoots } from "./api-utils";

@FuzzyFinderAdapter({
  fuzzy: "git.branches",
  previewRenderer: "preview.branch",
  dataAdapter: "gitBranchesAdapter",
  name: "Git Branches",
  description: "List and switch between Git branches",
})
export class GitBranchFuzzyFinder implements FuzzyFinderProvider {
  constructor(private options: GitBranchFinderOptions = {}) {}

  async onSelect(branch: BranchInfo): Promise<void> {
    const { repoPath, name } = branch;

    try {
      const localName = name.replace(/^remotes\/[^/]+\//, "");
      await execAsync(`git checkout ${localName}`, { cwd: repoPath });
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to checkout branch: ${name}`);
      console.error("[GitBranchFuzzyFinder] checkout error:", e);
    }
  }

  async querySelectableOptions(): Promise<BranchInfo[]> {
    const repos = await getGitRoots();
    if (repos.length === 0) return [];

    const includeRemotes = this.options.includeRemotes ?? true;
    const flag = includeRemotes ? "-a" : "";

    const perRepo = await Promise.allSettled(
      repos.map(async (repo) => {
        const [branchesResult, headResult, remotesResult] = await Promise.all([
          execAsync(`git branch ${flag} --format="%(refname:short)"`, { cwd: repo.path }),
          execAsync("git rev-parse --abbrev-ref HEAD", { cwd: repo.path }),
          execAsync("git remote", { cwd: repo.path }),
        ]);

        const currentBranch = headResult.stdout.trim();
        const remotes = remotesResult.stdout
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean);

        return branchesResult.stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map(
            (name): BranchInfo => ({
              name,
              repoName: repos.length > 1 ? repo.name : undefined,
              repoPath: repo.path,
              remote: remotes.some((r) => name.startsWith(`${r}/`)),
              current: name === currentBranch,
            }),
          );
      }),
    );

    return perRepo
      .filter((r): r is PromiseFulfilledResult<BranchInfo[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);
  }

  async getPreviewData(branch: BranchInfo): Promise<PreviewData<CommitInfo[]>> {
    const { repoPath, name } = branch;
    const commits = await this.findCommitsFromBranch(name, repoPath);
    return { content: commits };
  }

  public async findCommitsFromBranch(branch: string, cwd: string): Promise<CommitInfo[]> {
    try {
      const { stdout } = await execAsync(`git log ${branch} --max-count=50 --no-merges --format="%H|%s|%an|%aI"`, {
        cwd,
      });

      return stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [hash, message, author, date] = line.split("|");
          return { hash, message, author, date };
        });
    } catch (e) {
      console.error("[GitBranchFuzzyFinder] findCommitsFromBranch error:", e);
      return [];
    }
  }
}

type GitBranchFinderOptions = {
  includeRemotes?: boolean;
};
