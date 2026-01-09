import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

interface DiagnosticData {
  uri: vscode.Uri;
  diagnostic: vscode.Diagnostic;
  relativePath: string;
  line: number;
  column: number;
  severity: vscode.DiagnosticSeverity;
  message: string;
  source?: string;
  code?: string | number;
}

interface DiagnosticsFinderData {
  diagnostics: DiagnosticData[];
  displayTexts: string[];
  iconsClasses: string[];
}

export interface DiagnosticOption {
  index: number;
  diagnostic: DiagnosticData;
  displayText: string;
  codicon: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.diagnostics",
  preview: "preview.codeHighlighted",
})
export class DiagnosticsFinderDataAdapter implements IFuzzyFinderDataAdapter<DiagnosticsFinderData, DiagnosticOption> {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

  parseOptions(data: DiagnosticsFinderData): DiagnosticOption[] {
    const options: DiagnosticOption[] = [];

    for (let i = 0; i < data.diagnostics.length; i++) {
      options.push({
        index: i,
        codicon: data.iconsClasses[i],
        diagnostic: data.diagnostics[i],
        displayText: data.displayTexts[i],
      });
    }

    return options;
  }

  getDisplayText(option: DiagnosticOption): string {
    return `<i class="codicon codicon-${option.codicon} file-icon sk-diagnostic-${option.codicon}"></i><span class="file-path">${option.displayText}</span>`;
  }

  getSelectionValue(option: DiagnosticOption): string {
    return option.index.toString();
  }

  filterOption(option: DiagnosticOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const diag = option.diagnostic;

    return (
      diag.message.toLowerCase().includes(lowerQuery) ||
      diag.relativePath.toLowerCase().includes(lowerQuery) ||
      (diag.source?.toLowerCase().includes(lowerQuery) ?? false) ||
      (diag.code?.toString().toLowerCase().includes(lowerQuery) ?? false)
    );
  }
}
