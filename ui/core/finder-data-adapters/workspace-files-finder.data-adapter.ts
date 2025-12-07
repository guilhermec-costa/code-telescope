import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { FileFinderData } from "../../../shared/exchange/file-search";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";

export interface FileOption {
  absolute: string;
  relative: string;
}

export class WorkspaceFilesFinderDataAdapter implements IFuzzyFinderDataAdapter<FileFinderData, FileOption> {
  public readonly previewAdapterType: PreviewRendererType = "preview.codeHighlighted";
  public readonly fuzzyAdapterType: FuzzyProviderType = "workspace.files";

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
    return option.relative;
  }

  getSelectionValue(option: FileOption): string {
    return option.absolute;
  }

  filterOption(option: FileOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return option.relative.toLowerCase().includes(lowerQuery);
  }
}
