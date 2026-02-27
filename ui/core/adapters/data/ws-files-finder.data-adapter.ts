import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { FileFinderData } from "../../../../shared/exchange/file-search";
import { getSvgIconUrl } from "../../../utils/icon";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface FileOption {
  absolute: string;
  relative: string;
}

@FuzzyFinderDataAdapter({
  type: "workspaceFilesAdapter",
})
export class WorkspaceFilesFinderDataAdapter implements IFuzzyFinderDataAdapter<FileFinderData, FileOption> {
  debounceSearchTime?: number;
  typeName: DataAdapterType;

  parseOptions(data: FileFinderData): FileOption[] {
    const options: FileOption[] = [];

    for (let i = 0; i < data.relative.length; i++) {
      options.push({
        absolute: data.abs[i],
        relative: data.relative[i],
      });
    }

    return options;
  }

  getSearchText(option: FileOption): string {
    return option.relative;
  }

  getHtmlWrapper(option: FileOption, highlightedContent: string): string {
    const svgIconUrl = getSvgIconUrl(option.relative);
    return `
      <i class="file-icon">
        <img 
          src="${svgIconUrl}" 
          alt="" 
          loading="eager" 
          decoding="async"
          width="16"
          height="16"
        />
      </i>
      <span class="file-path">${highlightedContent}</span>
    `;
  }

  getSelectionValue(option: FileOption): string {
    return option.absolute;
  }

  filterOption(option: FileOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return option.relative.toLowerCase().includes(lowerQuery);
  }
}
