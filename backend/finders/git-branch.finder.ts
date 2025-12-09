import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../shared/adapters-namespace";
import { BranchInfo, CommitInfo } from "../../shared/exchange/branch-search";
import { PreviewData } from "../../shared/extension-webview-protocol";
import { Globals } from "../globals";
import { API, GitExtension, Ref } from "../types/git";
import { loadWebviewHtml } from "../utils/files";
import { FuzzyFinderProvider } from "./fuzzy-finder.provider";

export class GitBranchFuzzyFinder implements FuzzyFinderProvider {
  public readonly fuzzyAdapterType: FuzzyProviderType = "git.branches";
  public readonly previewAdapterType: PreviewRendererType = "preview.branch";

  /** Reference to the Git API exported by the official VS Code Git extension. */
  private readonly gitApi: API | null;

  constructor(
    private readonly wvPanel: vscode.WebviewPanel,
    private options: GitBranchFinderOptions = {},
  ) {
    this.gitApi = this.getGitApi();
  }

  onSelect?(item: string): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

  async loadWebviewHtml() {
    let rawHtml = await loadWebviewHtml("ui", "views", "branch-fuzzy.view.html");

    const replace = (search: string, distPath: string) => {
      const fullUri = this.wvPanel.webview.asWebviewUri(vscode.Uri.joinPath(Globals.EXTENSION_URI, distPath));
      rawHtml = rawHtml.replace(search, fullUri.toString());
    };

    replace("{{style}}", "ui/style/style.css");
    replace("{{script}}", "ui/dist/index.js");
    return rawHtml;
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
