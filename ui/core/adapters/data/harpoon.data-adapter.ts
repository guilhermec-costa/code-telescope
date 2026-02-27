import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { HarpoonFinderData, HarpoonMark } from "../../../../shared/exchange/harpoon";
import { formatFileOptionHtml } from "../../../utils/html";
import { getSvgIconUrl } from "../../../utils/icon";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface HarpoonOption {
  index: number;
  mark: HarpoonMark;
  svgIconUrl: string;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "harpoonMarksAdapter",
})
export class HarpoonFinderDataAdapter implements IFuzzyFinderDataAdapter<HarpoonFinderData, HarpoonOption> {
  typeName!: DataAdapterType;

  parseOptions(data: HarpoonFinderData): HarpoonOption[] {
    const options: HarpoonOption[] = [];

    for (let i = 0; i < data.marks.length; i++) {
      options.push({
        index: i,
        mark: data.marks[i],
        displayText: data.displayTexts[i],
        svgIconUrl: data.svgIconUrls[i],
      });
    }

    return options;
  }

  getDisplayText(option: HarpoonOption): string {
    const svgIconUrl = getSvgIconUrl(option.mark.uri.fsPath);
    return formatFileOptionHtml(svgIconUrl, option.displayText);
  }

  getSearchText(option: HarpoonOption): string {
    return option.displayText;
  }

  getSelectionValue(option: HarpoonOption): string {
    return option.index.toString();
  }

  filterOption(option: HarpoonOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const mark = option.mark;

    const path = mark.uri.fsPath.toLowerCase();
    const fileName = mark.uri.fsPath.split(/[\\/]/).pop()?.toLowerCase() || "";

    return (
      path.includes(lowerQuery) ||
      fileName.includes(lowerQuery) ||
      (mark.label?.toLowerCase().includes(lowerQuery) ?? false) ||
      option.index.toString() === query
    );
  }
}
