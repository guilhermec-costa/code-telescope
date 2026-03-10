export interface BranchInfo {
  name: string;
  remote?: boolean;
  current?: boolean;
  repoName?: string;
  repoPath: string;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}
