import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { BranchInfo } from "../../../shared/exchange/branch-search";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";

export class BranchFinderDataAdapter implements IFuzzyFinderDataAdapter<BranchInfo[], BranchInfo> {
  public readonly previewAdapterType: PreviewRendererType = "preview.branch";
  public readonly fuzzyAdapterType: FuzzyProviderType = "git.branches";

  parseOptions(data: BranchInfo[]) {
    return data;
  }

  getDisplayText(option: BranchInfo): string {
    const prefix = option.current ? "* " : "  ";
    const remote = option.remote ? ` (${option.remote})` : "";
    return `${prefix}${option.name}${remote}`;
  }

  getSelectionValue(option: BranchInfo): string {
    return option.name;
  }

  filterOption(option: BranchInfo, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const displayText = this.getDisplayText(option).toLowerCase();
    return displayText.includes(lowerQuery);
  }
}
