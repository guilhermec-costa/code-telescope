import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { TextSearchData } from "../../../../shared/exchange/workspace-text-search";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

interface SearchOption {
  identifier: string;
  file: string;
  line: number;
  preview: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.text",
  preview: "preview.codeHighlighted",
})
export class WorkspaceTextFinderDataAdapter implements IFuzzyFinderDataAdapter<TextSearchData, SearchOption> {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

  parseOptions(data: TextSearchData): SearchOption[] {
    return data.results.map((match) => ({
      identifier: `${match.file}:${match.line}:${match.column}`,
      file: match.file,
      line: match.line,
      preview: match.preview,
    }));
  }

  getDisplayText(option: SearchOption): string {
    const fileName = this.getFileName(option.file);
    return `${fileName}:${option.line} - ${option.preview}`;
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
