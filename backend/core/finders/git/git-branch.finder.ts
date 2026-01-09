import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { BranchInfo, CommitInfo } from "../../../../shared/exchange/branch-search";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { API, Ref } from "../../../@types/git";
import { IFuzzyFinderProvider, LayoutCustomPlaceholders } from "../../abstractions/fuzzy-finder.provider";
import { FuzzyFinderAdapter } from "../../decorators/fuzzy-finder-provider.decorator";
import { getGitApi } from "./api-utils";

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
    this.gitApi = getGitApi();
  }

  onSelect(item: string): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

  customPlaceholders(): LayoutCustomPlaceholders {
    return {
      layoutCssFilename: "classic.css",
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
