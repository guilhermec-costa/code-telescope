import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { FileFinderData } from "../../../../shared/exchange/file-search";
import { formatFileOptionHtml } from "../../../utils/html";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface FileOption {
  absolute: string;
  relative: string;
  svgIconUrl: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.files",
  preview: "preview.codeHighlighted",
})
export class WorkspaceFilesFinderDataAdapter implements IFuzzyFinderDataAdapter<FileFinderData, FileOption> {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

  parseOptions(data: FileFinderData): FileOption[] {
    const options: FileOption[] = [];

    for (let i = 0; i < data.relative.length; i++) {
      options.push({
        absolute: data.abs[i],
        relative: data.relative[i],
        svgIconUrl: data.svgIconUrl[i],
      });
    }

    return options;
  }

  getDisplayText(option: FileOption): string {
    let displayPath: string;
    switch (__FILE_PATH_DISPLAY__) {
      case "relative":
        displayPath = option.relative;
        break;
      case "absolute":
        displayPath = option.absolute;
        break;
      case "filename-only":
        displayPath = this.getFilename(option.absolute);
        break;
      default:
        displayPath = option.relative;
    }
    return formatFileOptionHtml(option.svgIconUrl, displayPath);
  }

  getSelectionValue(option: FileOption): string {
    return option.absolute;
  }

  filterOption(option: FileOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return option.relative.toLowerCase().includes(lowerQuery);
  }

  private getFilename(filepath: string): string {
    return filepath.split(/[\\/]/).pop() || filepath;
  }
}
