import { FuzzyAdapter, PreviewAdapter } from "../../../shared/adapters-namespace";
import { IFinderAdapter } from "./finder-adapter";

interface TextSearchData {
  results: TextSearchMatch[];
  query: string;
}

interface TextSearchMatch {
  file: string;
  line: number;
  column: number;
  text: string;
  preview: string;
}

interface SearchOption {
  identifier: string;
  file: string;
  line: number;
  preview: string;
}

export class WorkspaceTextSearchAdapter implements IFinderAdapter<TextSearchData, SearchOption> {
  readonly previewAdapterType: PreviewAdapter = "code-with-highlight";
  readonly fuzzyAdapterType: FuzzyAdapter = "workspace-text-search";

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

  getPreviewIdentifier(option: SearchOption): string {
    return option.identifier;
  }

  private getFileName(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1];
  }
}
