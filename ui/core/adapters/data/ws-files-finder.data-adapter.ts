import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { FileFinderData } from "../../../../shared/exchange/file-search";
import { formatFileOptionHtml } from "../../../utils/html";
import { getSvgIconUrl } from "../../../utils/icon";
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
  typeName!: DataAdapterType;

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
    return this.getDisplayPath(option);
  }

  getHtmlWrapper(option: FileOption, highlightedContent: string): string {
    const svgIconUrl = getSvgIconUrl(option.relative);
    return formatFileOptionHtml(svgIconUrl, highlightedContent);
  }

  getSelectionValue(option: FileOption): string {
    return option.absolute;
  }

  private getDisplayPath(option: FileOption): string {
    switch (__FILE_PATH_DISPLAY__) {
      case "absolute":
        return option.absolute;
      case "filename-only":
        return option.relative.split(/[/\\]/).at(-1) ?? option.relative;
      default:
        return option.relative;
    }
  }
}
