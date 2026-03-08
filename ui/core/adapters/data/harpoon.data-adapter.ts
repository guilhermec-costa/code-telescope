import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { HarpoonFinderData, HarpoonMark } from "../../../../shared/exchange/harpoon";
import { formatFileOptionHtml } from "../../../utils/html";
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

  getSearchText(option: HarpoonOption): string {
    return `${option.mark.uri.fsPath} ${option.mark.label || ""}`;
  }

  getHtmlWrapper(option: HarpoonOption, highlightedContent: string): string {
    return formatFileOptionHtml(option.svgIconUrl, highlightedContent);
  }

  getSelectionValue(option: HarpoonOption): string {
    return option.index.toString();
  }
}
