import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { RecentFileData, RecentFilesFinderData } from "../../../../shared/exchange/recent-files";
import { formatFileOptionHtml } from "../../../utils/html";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface RecentFileOption {
  index: number;
  svgIconUrl: string;
  file: RecentFileData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.recentFiles",
  preview: "preview.codeHighlighted",
})
export class RecentFilesFinderDataAdapter implements IFuzzyFinderDataAdapter<RecentFilesFinderData, RecentFileOption> {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

  parseOptions(data: RecentFilesFinderData): RecentFileOption[] {
    const options: RecentFileOption[] = [];

    for (let i = 0; i < data.files.length; i++) {
      options.push({
        index: i,
        svgIconUrl: data.svgIconUrls[i],
        file: data.files[i],
        displayText: data.displayTexts[i],
      });
    }

    return options;
  }

  getDisplayText(option: RecentFileOption): string {
    return formatFileOptionHtml(option.svgIconUrl, option.displayText);
  }

  getSelectionValue(option: RecentFileOption): string {
    return option.file.path;
  }

  filterOption(option: RecentFileOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const file = option.file;

    return file.relativePath.toLowerCase().includes(lowerQuery) || file.path.toLowerCase().includes(lowerQuery);
  }
}
