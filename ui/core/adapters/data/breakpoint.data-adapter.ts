import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { BreakpointData, BreakpointsFinderData } from "../../../../shared/exchange/breakpoint";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface BreakpointOption {
  index: number;
  breakpoint: BreakpointData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "debugBreakpointsAdapter",
})
export class BreakpointsFinderDataAdapter implements IFuzzyFinderDataAdapter<BreakpointsFinderData, BreakpointOption> {
  typeName!: DataAdapterType;

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

  getSearchText(option: BreakpointOption): string {
    const bp = option.breakpoint;
    return `${bp.uri.fsPath} ${bp.condition || ""} ${bp.hitCondition || ""} ${bp.logMessage || ""} ${bp.line}`;
  }

  getHtmlWrapper(option: BreakpointOption, highlightedContent: string): string {
    const bp = option.breakpoint;

    const statusIcon = bp.enabled
      ? `<i class="codicon codicon-debug-breakpoint file-icon sk-breakpoint-active"></i>`
      : `<i class="codicon codicon-debug-breakpoint-disabled file-icon sk-breakpoint-disabled"></i>`;

    const conditionBadge = bp.condition
      ? `<span class="sk-bp-badge sk-bp-badge--condition" title="Condition: ${bp.condition}">C</span>`
      : "";
    const hitBadge = bp.hitCondition
      ? `<span class="sk-bp-badge sk-bp-badge--hit" title="Hit condition: ${bp.hitCondition}">H</span>`
      : "";
    const logBadge = bp.logMessage
      ? `<span class="sk-bp-badge sk-bp-badge--log" title="Log: ${bp.logMessage}">L</span>`
      : "";

    const disabledAttr = !bp.enabled ? `sk-bp-row--disabled` : "";

    return `
    ${statusIcon}
    <span class="file-path ${disabledAttr}">${highlightedContent}</span>
    <span class="sk-bp-badges">
      ${conditionBadge}${hitBadge}${logBadge}
    </span>
  `;
  }

  getSelectionValue(option: BreakpointOption): string {
    return option.index.toString();
  }
}
