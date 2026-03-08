import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { FontData, FontFinderData } from "../../../../shared/exchange/font-family";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface FontOption {
  index: number;
  font: FontData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "fontsAdapter",
})
export class FontsFinderDataAdapter implements IFuzzyFinderDataAdapter<FontFinderData, FontOption> {
  typeName: DataAdapterType;

  parseOptions(data: FontFinderData): FontOption[] {
    return data.fonts.map((font, i) => ({
      index: i,
      font,
      displayText: data.displayTexts[i],
    }));
  }

  getSearchText(option: FontOption): string {
    return option.font.name;
  }

  getHtmlWrapper(option: FontOption, highlightedContent: string): string {
    return `<i class="codicon codicon-text-size file-icon"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: FontOption): string {
    return option.index.toString();
  }
}
