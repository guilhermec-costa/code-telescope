import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { BranchFinderData, BranchInfo } from "../../../shared/exchange/branch-search";
import { IFinderAdapter } from "./finder-adapter";

export type BranchOption = { type: "branch"; data: BranchInfo };

export class BranchFinderAdapter implements IFinderAdapter<BranchFinderData, BranchOption> {
  public readonly previewAdapterType: PreviewRendererType = "preview.gitBranch";
  public readonly fuzzyAdapterType: FuzzyProviderType = "git.branches";

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
