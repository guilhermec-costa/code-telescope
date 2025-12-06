import { FuzzyAdapter, PreviewAdapter } from "../../../shared/adapters-namespace";
import { IFinderAdapter } from "./finder-adapter";

export interface FileFinderData {
  abs: string[];
  relative: string[];
}

export interface FileOption {
  absolute: string;
  relative: string;
}

export class FileFinderAdapter implements IFinderAdapter<FileFinderData, FileOption> {
  public readonly previewAdapterType: PreviewAdapter = "workspace-file-finder";
  public readonly fuzzyAdapterType: FuzzyAdapter = "workspace-file-finder";

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

  getPreviewIdentifier(option: FileOption) {
    return option.absolute;
  }
}
