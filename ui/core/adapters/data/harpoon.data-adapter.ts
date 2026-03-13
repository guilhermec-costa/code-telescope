import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { HarpoonFinderData, HarpoonMark } from "../../../../shared/exchange/harpoon";
import { formatFileOptionHtml } from "../../../utils/html";
import { getSvgIconUrl } from "../../../utils/icon";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface HarpoonOption {
  index: number;
  mark: HarpoonMark;
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
      });
    }

    return options;
  }

  getSearchText(option: HarpoonOption): string {
    return option.displayText;
  }

  getHtmlWrapper(option: HarpoonOption, highlightedContent: string): string {
    const svgIconUrl = getSvgIconUrl(option.mark.uri.fsPath);
    return formatFileOptionHtml(svgIconUrl, highlightedContent);
  }

  getSelectionValue(option: HarpoonOption): string {
    return option.index.toString();
  }
}
