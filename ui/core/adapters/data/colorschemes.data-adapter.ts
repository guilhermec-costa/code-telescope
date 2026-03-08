import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { ColorSchemesFinderData, ColorThemeData } from "../../../../shared/exchange/colorschemes";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface ColorSchemeOption {
  index: number;
  theme: ColorThemeData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "workspaceColorschemesAdapter",
})
export class ColorSchemesFinderDataAdapter
  implements IFuzzyFinderDataAdapter<ColorSchemesFinderData, ColorSchemeOption>
{
  typeName: DataAdapterType;

  parseOptions(data: ColorSchemesFinderData): ColorSchemeOption[] {
    const options: ColorSchemeOption[] = [];

    for (let i = 0; i < data.themes.length; i++) {
      options.push({
        index: i,
        theme: data.themes[i],
        displayText: data.displayTexts[i],
      });
    }

    return options;
  }

  getSearchText(option: ColorSchemeOption): string {
    const ext = option.theme.extensionId ? `(${option.theme.extensionId})` : "";
    return `${option.theme.label} ${ext}`;
  }

  getHtmlWrapper(option: ColorSchemeOption, highlightedContent: string): string {
    return `<i class="codicon codicon-symbol-color file-icon sk-symbol-color"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: ColorSchemeOption) {
    return option.theme;
  }

  filterOption(option: ColorSchemeOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const theme = option.theme;

    return (
      theme.label.toLowerCase().includes(lowerQuery) || (theme.extensionId?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }

  sortFn(x1: ColorSchemeOption, x2: ColorSchemeOption): number {
    return x1.displayText.localeCompare(x2.displayText);
  }
}
