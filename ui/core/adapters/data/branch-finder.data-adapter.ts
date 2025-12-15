import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { BranchInfo } from "../../../../shared/exchange/branch-search";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  fuzzy: "git.branches",
  preview: "preview.branch",
})
export class BranchFinderDataAdapter implements IFuzzyFinderDataAdapter<BranchInfo[], BranchInfo> {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

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
  debounceSearchTime = 30;
}
