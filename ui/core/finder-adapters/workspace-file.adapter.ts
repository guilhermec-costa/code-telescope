import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { FileFinderData } from "../../../shared/exchange/file-search";
import { IFinderAdapter } from "../abstractions/finder-adapter";

export interface FileOption {
  absolute: string;
  relative: string;
}

export class FileFinderAdapter implements IFinderAdapter<FileFinderData, FileOption> {
  public readonly previewAdapterType: PreviewRendererType = "preview.workspaceFile";
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
