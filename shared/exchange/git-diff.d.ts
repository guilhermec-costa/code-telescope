export type GitDiffKind = "staged" | "unstaged" | "untracked";

export interface GitDiffInfo {
  repoPath: string;
  repoName?: string;
  relativePath: string;
  absolutePath: string;
  status: string;
  kind: GitDiffKind;
}
