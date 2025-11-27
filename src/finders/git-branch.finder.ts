import * as vscode from "vscode";

export class GitBranchFinder {
  private gitApi: any;

  constructor() {
    this.gitApi = this.getGitApi();
  }

  async find(options?: { includeRemotes?: boolean }) {
    if (!this.gitApi) return [];

    const repo = this.gitApi.repositories[0];
    if (!repo) return [];

    const includeRemotes = options?.includeRemotes ?? false;

    const refs: any[] = await repo.getRefs();
    const branches = refs.reduce<{ local: any[]; remote: any[] }>(
      (acc, branch) => {
        branch.type == 0 ? acc.local.push(branch) : includeRemotes && acc.remote.push(branch);
        return acc;
      },
      {
        local: [],
        remote: [],
      },
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
