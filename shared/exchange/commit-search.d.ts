export interface CommitSearchInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  repoName: string | undefined;
  repoPath: string;
}

export interface CommitDiffInfo extends CommitSearchInfo {
  diff: string;
}
