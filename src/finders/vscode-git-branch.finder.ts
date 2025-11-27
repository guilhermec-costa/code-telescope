import * as vscode from "vscode";
import { API, GitExtension, Ref } from "../types/git";
import { FuzzyProvider } from "./fuzzy-provider";

export class VSCodeGitBranchFinder implements FuzzyProvider {
  private readonly gitApi: API | null;

  constructor(private options: GitBranchFinderOptions = {}) {
    this.gitApi = this.getGitApi();
  }

  async querySelectableOptions(): Promise<string[]> {
    const branches = await this.findBranches();
    return branches.map((branch) => branch.name || "");
  }

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

  private getGitApi() {
    const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git");
    if (!gitExtension) return null;

    const git = gitExtension.exports;
    return git.getAPI(1);
  }
}

type GitBranchFinderOptions = {
  includeRemotes?: boolean;
};
