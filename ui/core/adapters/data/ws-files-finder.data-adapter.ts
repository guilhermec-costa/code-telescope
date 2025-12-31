import { getClassWithColor } from "file-icons-js";
import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { FileFinderData } from "../../../../shared/exchange/file-search";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface FileOption {
  absolute: string;
  relative: string;
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
      });
    }

    return options;
  }

  getDisplayText(option: FileOption): string {
    const filename = this.getFilename(option.absolute);
    const iconClass = getClassWithColor(filename);

    let displayPath: string;
    switch (__FILE_PATH_DISPLAY__) {
      case "relative":
        displayPath = option.relative;
        break;
      case "absolute":
        displayPath = option.absolute;
        break;
      case "filename-only":
        displayPath = filename;
        break;
      default:
        displayPath = option.relative;
    }

    return `<i class="${iconClass} file-icon"></i><span class="file-path">${displayPath}</span>`;
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
