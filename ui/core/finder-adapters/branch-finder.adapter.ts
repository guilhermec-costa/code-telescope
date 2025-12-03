import { FuzzyAdapter } from "../../../shared/adapters-namespace";
import { IFinderAdapter } from "./finder-adapter";

export interface BranchFinderData {
  branches: BranchInfo[];
}

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

export type BranchOption = { type: "branch"; data: BranchInfo };

export class BranchFinderAdapter implements IFinderAdapter<BranchFinderData, BranchOption> {
  public readonly type: FuzzyAdapter = "vscode-branch-finder";

  parseOptions(data: BranchFinderData): BranchOption[] {
    const options: BranchOption[] = [];

    if (data.branches) {
      for (const branch of data.branches) {
        options.push({ type: "branch", data: branch });
      }
    }

    return options;
  }

  getDisplayText(option: BranchOption): string {
    switch (option.type) {
      case "branch":
        const prefix = option.data.current ? "* " : "  ";
        const remote = option.data.remote ? ` (${option.data.remote})` : "";
        return `${prefix}${option.data.name}${remote}`;

      default:
        return "";
    }
  }

  getSelectionValue(option: BranchOption): string {
    switch (option.type) {
      case "branch":
        return option.data.name;
      default:
        return "";
    }
  }

  filterOption(option: BranchOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const displayText = this.getDisplayText(option).toLowerCase();
    return displayText.includes(lowerQuery);
  }

  getPreviewIdentifier(option: BranchOption): string {
    return this.getDisplayText(option);
  }
}
