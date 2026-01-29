import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { BreakpointData, BreakpointsFinderData } from "../../../../shared/exchange/breakpoint";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface BreakpointOption {
  index: number;
  breakpoint: BreakpointData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "debug.breakpoints",
  preview: "preview.codeHighlighted",
})
export class BreakpointsFinderDataAdapter implements IFuzzyFinderDataAdapter<BreakpointsFinderData, BreakpointOption> {
  previewAdapterType!: PreviewRendererType;
  fuzzyAdapterType!: FuzzyProviderType;

  parseOptions(data: BreakpointsFinderData): BreakpointOption[] {
    const options: BreakpointOption[] = [];

    for (let i = 0; i < data.breakpoints.length; i++) {
      options.push({
        index: i,
        breakpoint: data.breakpoints[i],
        displayText: data.displayTexts[i],
      });
    }

    return options;
  }

  getDisplayText(option: BreakpointOption): string {
    const bp = option.breakpoint;
    const relativePath = option.displayText.split(" ").slice(1).join(" ");

    const statusIcon = bp.enabled
      ? '<i class="codicon codicon-debug-breakpoint file-icon" style="color: #e51400;"></i>'
      : '<i class="codicon codicon-debug-breakpoint-disabled file-icon" style="color: #848484;"></i>';

    let badges = "";
    if (bp.condition) {
      badges +=
        '<span class="breakpoint-badge" style="background: #0e639c; padding: 2px 6px; border-radius: 3px; margin-left: 8px; font-size: 0.9em;">C</span>';
    }
    if (bp.hitCondition) {
      badges +=
        '<span class="breakpoint-badge" style="background: #8f4e00; padding: 2px 6px; border-radius: 3px; margin-left: 4px; font-size: 0.9em;">H</span>';
    }
    if (bp.logMessage) {
      badges +=
        '<span class="breakpoint-badge" style="background: #1a7f37; padding: 2px 6px; border-radius: 3px; margin-left: 4px; font-size: 0.9em;">L</span>';
    }

    return `${statusIcon}<span class="file-path">${relativePath}</span>${badges}`;
  }

  getSelectionValue(option: BreakpointOption): string {
    return option.index.toString();
  }

  filterOption(option: BreakpointOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const bp = option.breakpoint;

    const filePath = bp.uri.fsPath.toLowerCase();
    const fileName = bp.uri.fsPath.split(/[\\/]/).pop()?.toLowerCase() || "";

    return (
      filePath.includes(lowerQuery) ||
      fileName.includes(lowerQuery) ||
      (bp.condition?.toLowerCase().includes(lowerQuery) ?? false) ||
      (bp.hitCondition?.toLowerCase().includes(lowerQuery) ?? false) ||
      (bp.logMessage?.toLowerCase().includes(lowerQuery) ?? false) ||
      `${bp.line + 1}`.includes(lowerQuery)
    );
  }
}
