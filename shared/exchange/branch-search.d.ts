export interface BranchInfo {
  name: string;
  remote?: string;
  current?: boolean;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}
