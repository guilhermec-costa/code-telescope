import * as vscode from "vscode";
import { DiagnosticData, DiagnosticsFinderData } from "../../../shared/exchange/diagnostics";
import { TextPreviewData } from "../../../shared/extension-webview-protocol";
import { getLanguageIdForFile } from "../../utils/files";
import { FileReader } from "../common/cache/file-reader";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider that retrieves all diagnostics (errors, warnings, etc.) in the workspace.
 *
 * Lists all problems from all files, sorted by severity.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.diagnostics",
  previewRenderer: "preview.buffer",
  dataAdapter: "workspaceDiagnosticsAdapter",
})
export class DiagnosticsFinder implements FuzzyFinderProvider {
  private cachedDiagnostics: DiagnosticData[] | null = null;

  constructor() {
    vscode.languages.onDidChangeDiagnostics(() => {
      this.cachedDiagnostics = null;
    });
  }

  async querySelectableOptions(): Promise<DiagnosticsFinderData> {
    const diagnostics = await this.getAllDiagnostics();

    const { displayTexts, iconsClasses } = diagnostics.reduce<{ displayTexts: string[]; iconsClasses: string[] }>(
      (acc, d) => {
        const location = `${d.relativePath}:${d.line}:${d.column}`.padEnd(50);
        const source = d.source ? `[${d.source}]` : "";
        const message = d.message.slice(0, 60);
        acc.displayTexts.push(`${location} ${source} ${message}`);
        acc.iconsClasses.push(this.getSeverityCodicon(d.severity));
        return acc;
      },
      { displayTexts: [], iconsClasses: [] },
    );

    return {
      diagnostics,
      displayTexts,
      iconsClasses,
    };
  }

  async onSelect(selectedIndex: string) {
    const index = parseInt(selectedIndex, 10);
    const diagnostics = await this.getAllDiagnostics();
    const selected = diagnostics[index];

    if (!selected) return;

    const document = await vscode.workspace.openTextDocument(selected.uri);
    const editor = await vscode.window.showTextDocument(document);

    const position = new vscode.Position(selected.line - 1, selected.column - 1);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(selected.diagnostic.range, vscode.TextEditorRevealType.InCenter);
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData> {
    const index = parseInt(identifier, 10);
    const diagnostics = await this.getAllDiagnostics();
    const selected = diagnostics[index];

    if (!selected) {
      return {
        content: "No diagnostic selected",
        kind: "text",
        language: "plaintext",
      };
    }

    const filePath = selected.uri.fsPath;
    const highlightLine = selected.line - 1;

    const content = await FileReader.read(filePath);

    return {
      content: content as string,
      kind: "text",
      language: getLanguageIdForFile(filePath),
      metadata: {
        highlightLine,
      },
    };
  }

  /**
   * Gets all diagnostics from the workspace
   */
  private async getAllDiagnostics(): Promise<DiagnosticData[]> {
    if (this.cachedDiagnostics) {
      return this.cachedDiagnostics;
    }

    const allDiagnostics: DiagnosticData[] = [];
    const diagnostics = vscode.languages.getDiagnostics();

    for (const [uri, fileDiagnostics] of diagnostics) {
      if (uri.scheme !== "file") continue;

      const relativePath = vscode.workspace.asRelativePath(uri);

      for (const diagnostic of fileDiagnostics) {
        allDiagnostics.push({
          uri,
          diagnostic,
          relativePath,
          line: diagnostic.range.start.line + 1,
          column: diagnostic.range.start.character + 1,
          severity: diagnostic.severity,
          message: diagnostic.message,
          source: diagnostic.source,
          code: typeof diagnostic.code === "object" ? diagnostic.code.value : diagnostic.code,
        });
      }
    }

    allDiagnostics.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity - b.severity;
      }
      return a.relativePath.localeCompare(b.relativePath);
    });

    this.cachedDiagnostics = allDiagnostics;
    return allDiagnostics;
  }

  /**
   * Returns an icon based on diagnostic severity
   */
  private getSeverityCodicon(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return "error";
      case vscode.DiagnosticSeverity.Warning:
        return "warning";
      case vscode.DiagnosticSeverity.Information:
        return "info";
      case vscode.DiagnosticSeverity.Hint:
        return "lightbulb";
      default:
        return "debug-breakpoint-log";
    }
  }
}
