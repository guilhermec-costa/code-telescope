import * as vscode from "vscode";
import { FuzzyProvider } from "./fuzzy-provider";

export class VSCodeGitBranchFinder implements FuzzyProvider {
  private readonly gitApi: any | null;

  constructor(private options: GitBranchFinderOptions = {}) {
    this.gitApi = this.getGitApi();
  }

  async findSelectableOptions(): Promise<string[]> {
    const branches = await this.findBranches();
    return branches.map((branch) => branch.name);
  }

  public async findBranches() {
    if (!this.gitApi) return [];
    const repo = this.gitApi.repositories[0];
    if (!repo) return [];

    const includeRemotes = this.options?.includeRemotes ?? false;
    const refs: BranchInfo[] = await repo.getRefs();

    const branches = refs.reduce<{ local: BranchInfo[]; remote: BranchInfo[] }>(
      (acc, branch) => {
        branch.type == 0 ? acc.local.push(branch) : includeRemotes && acc.remote.push(branch);
        return acc;
      },
      { local: [], remote: [] },
    );
    return [...branches.local, ...branches.remote];
  }

  private getGitApi() {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) return null;

    const git = gitExtension.exports;
    return git.getAPI(1);
  }
}

type GitBranchFinderOptions = {
  includeRemotes?: boolean;
};

export interface BranchInfo {
  name: string;
  type: number;
}
