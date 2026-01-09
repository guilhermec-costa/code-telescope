import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

interface ColorThemeData {
  id: string;
  label: string;
  uiTheme: string;
  extensionId?: string;
  isCurrent: boolean;
}

interface ColorSchemesFinderData {
  themes: ColorThemeData[];
  displayTexts: string[];
}

export interface ColorSchemeOption {
  index: number;
  theme: ColorThemeData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.colorschemes",
  preview: "preview.codeHighlighted",
})
export class ColorSchemesFinderDataAdapter
  implements IFuzzyFinderDataAdapter<ColorSchemesFinderData, ColorSchemeOption>
{
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

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

  getDisplayText(option: ColorSchemeOption): string {
    return `<i class="codicon codicon-symbol-color file-icon sk-symbol-color"></i><span class="file-path">${option.displayText}</span>`;
  }

  getSelectionValue(option: ColorSchemeOption): string {
    return option.index.toString();
  }

  filterOption(option: ColorSchemeOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const theme = option.theme;

    return (
      theme.label.toLowerCase().includes(lowerQuery) || (theme.extensionId?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }
}
