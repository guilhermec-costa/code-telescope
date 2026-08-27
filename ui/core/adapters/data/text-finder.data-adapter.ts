import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { TextSearchData } from "../../../../shared/exchange/workspace-text-search";
import { formatFileOptionHtml } from "../../../utils/html";
import { getSvgIconUrl } from "../../../utils/icon";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

interface SearchOption {
  identifier: string;
  file: string;
  relativeFile?: string;
  line: number;
  preview: string;
}

@FuzzyFinderDataAdapter({
  type: "textSearchAdapter",
})
export class TextFinderDataAdapter implements IFuzzyFinderDataAdapter<TextSearchData, SearchOption> {
  typeName: DataAdapterType;
  debounceSearchTime = 150;

  parseOptions(data: TextSearchData): SearchOption[] {
    return data.results.map((match) => ({
      identifier: `${match.file}||${match.line}||${match.column}`,
      file: match.file,
      relativeFile: match.relativeFile,
      line: match.line,
      preview: match.preview,
    }));
  }

  getSearchText(option: SearchOption): string {
    return `${this.getPrefix(option)}${option.preview}`;
  }

  getHtmlWrapper(option: SearchOption, highlightedContent: string): string {
    const svgIconUrl = getSvgIconUrl(option.file);
    return formatFileOptionHtml(svgIconUrl, highlightedContent);
  }

  getSelectionValue(option: SearchOption): string {
    return option.identifier;
  }

  calcHlOffsetChars(option: SearchOption): number {
    return this.getPrefix(option).length;
  }

  private getPrefix(option: SearchOption): string {
    return `${this.getDisplayPath(option)}:${option.line} `;
  }

  private getDisplayPath(option: SearchOption): string {
    switch (__FILE_PATH_DISPLAY__) {
      case "absolute":
        return option.file;
      case "filename-only":
        return this.getFileName(option.file);
      default:
        return option.relativeFile ?? this.getFileName(option.file);
    }
  }

  private getFileName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  }
}
