export interface CommitSearchInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface CommitDiffInfo extends CommitSearchInfo {
  diff: string;
}
