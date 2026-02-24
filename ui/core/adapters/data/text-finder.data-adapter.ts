import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { TextSearchData } from "../../../../shared/exchange/workspace-text-search";
import { formatFileOptionHtml } from "../../../utils/html";
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

  getDisplayText(option: SearchOption): string {
    const fileName = this.getFileName(option.file);
    const displayText = `${fileName}:${option.line} - ${option.preview}`;
    const svgIconUrl = getSvgIconUrl(option.file);
    return formatFileOptionHtml(svgIconUrl, displayText);
  }

  getSelectionValue(option: SearchOption): string {
    return option.identifier;
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
