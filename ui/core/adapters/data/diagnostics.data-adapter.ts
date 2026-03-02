import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { DiagnosticOption, DiagnosticsFinderData } from "../../../../shared/exchange/diagnostics";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  type: "workspaceDiagnosticsAdapter",
})
export class DiagnosticsFinderDataAdapter implements IFuzzyFinderDataAdapter<DiagnosticsFinderData, DiagnosticOption> {
  typeName: DataAdapterType;

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

  getSearchText(option: DiagnosticOption): string {
    const diag = option.diagnostic;
    const fileName = diag.relativePath.split(/[/\\]/).pop() || "";
    const source = diag.source ? `(${diag.source})` : "";
    return `${fileName}:${diag.line + 1} ${diag.message.slice(0, 60)}${diag.message.length > 60 ? "..." : ""} ${source}`;
  }

  getHtmlWrapper(option: DiagnosticOption, highlightedContent: string): string {
    return `<i class="codicon codicon-${option.codicon} file-icon sk-diagnostic-${option.codicon}"></i><span class="file-path">${highlightedContent}</span>`;
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
