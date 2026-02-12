import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { TextSearchData } from "../../../../shared/exchange/workspace-text-search";
import { formatFileOptionHtml } from "../../../utils/html";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

interface SearchOption {
  identifier: string;
  svgIconUrl: string;
  file: string;
  line: number;
  preview: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "currentFile.text",
  preview: "preview.codeHighlighted",
})
export class WorkspaceTextFinderDataAdapter implements IFuzzyFinderDataAdapter<TextSearchData, SearchOption> {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;
  debounceSearchTime = 100;

  parseOptions(data: TextSearchData): SearchOption[] {
    return data.results.map((match) => ({
      identifier: `${match.file}||${match.line}||${match.column}`,
      svgIconUrl: match.svgIconUrl,
      file: match.file,
      line: match.line,
      preview: match.preview,
    }));
  }

  getDisplayText(option: SearchOption): string {
    const fileName = this.getFileName(option.file);
    const displayText = `${fileName}:${option.line} - ${option.preview}`;
    return formatFileOptionHtml(option.svgIconUrl, displayText);
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
