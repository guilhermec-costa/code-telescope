import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { DiagnosticOption, DiagnosticsFinderData } from "../../../../shared/exchange/diagnostics";
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
    return `${fileName}:${diag.line} ${diag.message.slice(0, 60)}${diag.message.length > 60 ? "..." : ""} ${source}`;
  }

  getHtmlWrapper(option: DiagnosticOption, highlightedContent: string): string {
    return `<i class="codicon codicon-${option.codicon} file-icon sk-diagnostic-${option.codicon}"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: DiagnosticOption): string {
    return option.index.toString();
  }
}
