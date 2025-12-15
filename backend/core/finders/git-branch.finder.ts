import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { BranchInfo, CommitInfo } from "../../../shared/exchange/branch-search";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { API, GitExtension, Ref } from "../../@types/git";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

@FuzzyFinderAdapter({
  fuzzy: "git.branches",
  previewRenderer: "preview.branch",
})
export class GitBranchFuzzyFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  /** Reference to the Git API exported by the official VS Code Git extension. */
  private readonly gitApi: API | null;

  constructor(private options: GitBranchFinderOptions = {}) {
    this.gitApi = this.getGitApi();
  }

  onSelect(item: string): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

  getHtmlLoadConfig() {
    return {
      fileName: "branch-fuzzy.view.html",
      placeholders: {
        "{{style}}": "ui/style/style.css",
        "{{script}}": "ui/dist/index.js",
      },
    };
  }

  /**
   * Returns the list of branches to display in the fuzzy finder.
   */
  async querySelectableOptions(): Promise<BranchInfo[]> {
    const branches = await this.findBranches();
    return branches.map((ref) => ({
      name: ref.name || "",
      remote: ref.remote,
      current: false,
      type: ref.type,
    }));
  }

  /**
   * Retrieves Git branches from the current repository, separating local
   * and remote refs. Remote branches are included only when enabled.
   */
  public async findBranches() {
    if (!this.gitApi) return [];
    const repo = this.gitApi.repositories[0];
    if (!repo) return [];

    const includeRemotes = this.options?.includeRemotes ?? false;
    const refs = await repo.getRefs({});

    const branches = refs.reduce<{ local: Ref[]; remote: Ref[] }>(
      (acc, branch) => {
        branch.type == 0 ? acc.local.push(branch) : includeRemotes && acc.remote.push(branch);
        return acc;
      },
      { local: [], remote: [] },
    );
    return [...branches.local, ...branches.remote];
  }

  public async findCommitsFromBranch(branch: string) {
    if (!this.gitApi) return [];
    const repo = this.gitApi.repositories[0];
    const log = await repo.log({ refNames: [branch] });
    return log.map((commit) => ({
      hash: commit.hash,
      message: commit.message,
      author: commit.authorName || "",
      date: commit.authorDate?.toISOString() || "",
    }));
  }
  /**
   * Loads the Git extension and returns its exposed API instance.
   * If the extension is unavailable, `null` is returned.
   */
  private getGitApi() {
    const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git");
    if (!gitExtension) return null;

    const git = gitExtension.exports;
    return git.getAPI(1);
  }

  async getPreviewData(branchName: string): Promise<PreviewData<CommitInfo[]>> {
    const commits = await this.findCommitsFromBranch(branchName);
    return {
      content: commits,
    };
  }
}

/**
 * Configuration options for the VSCodeGitBranchFinder.
 */
type GitBranchFinderOptions = {
  includeRemotes?: boolean;
};
