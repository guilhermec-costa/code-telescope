import * as vscode from "vscode";
import { Globals } from "../globals";
import { API, GitExtension, Ref } from "../types/git";
import { loadWebviewHtml } from "../utils/files";
import { FuzzyProvider } from "./fuzzy-provider";

export class VSCodeGitBranchFinder implements FuzzyProvider {
  /** Reference to the Git API exported by the official VS Code Git extension. */
  private readonly gitApi: API | null;

  constructor(
    private readonly panel: vscode.WebviewPanel,
    private options: GitBranchFinderOptions = {},
  ) {
    this.gitApi = this.getGitApi();
  }

  onSelect?(item: string): void | Promise<void> {
    throw new Error("Method not implemented.");
  }

  async loadWebviewHtml() {
    let rawHtml = await loadWebviewHtml("media-src", "fuzzy", "branch-fuzzy.view.html");

    const replace = (search: string, distPath: string) => {
      const fullUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(Globals.EXTENSION_URI, distPath));
      rawHtml = rawHtml.replace(search, fullUri.toString());
    };

    replace("{{style}}", "media-src/fuzzy/style.css");
    replace("{{script}}", "media-dist/fuzzy/index.js");
    return rawHtml;
  }

  /**
   * Returns the list of branches to display in the fuzzy finder.
   */
  async querySelectableOptions(): Promise<string[]> {
    const branches = await this.findBranches();
    return branches.map((branch) => branch.name || "");
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
}

/**
 * Configuration options for the VSCodeGitBranchFinder.
 */
type GitBranchFinderOptions = {
  includeRemotes?: boolean;
};
