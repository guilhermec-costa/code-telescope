import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { TextSearchData } from "../../../../shared/exchange/workspace-text-search";
import { getSvgIconUrl } from "../../../utils/icon";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

interface SearchOption {
  identifier: string;
  file: string;
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
      line: match.line,
      preview: match.preview,
    }));
  }

  getSearchText(option: SearchOption): string {
    const fileName = this.getFileName(option.file);
    return `${fileName}:${option.line} - ${option.preview}`;
  }

  getHtmlWrapper(option: SearchOption, highlightedContent: string): string {
    const svgIconUrl = getSvgIconUrl(option.file);
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

  getSelectionValue(option: SearchOption): string {
    return option.identifier;
  }

  calcHlOffsetChars(option: SearchOption): number {
    const fileName = this.getFileName(option.file);
    const prefix = `${fileName}:${option.line} - `;
    return prefix.length;
  }

  filterOption(option: SearchOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return option.file.toLowerCase().includes(lowerQuery) || option.preview.toLowerCase().includes(lowerQuery);
  }

  private getFileName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  }
}
