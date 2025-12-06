export interface BranchFinderData {
  branches: BranchInfo[];
}

export interface BranchInfo {
  name: string;
  remote?: string;
  current?: boolean;
}
