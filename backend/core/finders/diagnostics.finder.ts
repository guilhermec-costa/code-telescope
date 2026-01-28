import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { DiagnosticData, DiagnosticsFinderData } from "../../../shared/exchange/diagnostics";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { resolvePathExt } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileReader } from "../common/cache/file-reader";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider that retrieves all diagnostics (errors, warnings, etc.) in the workspace.
 *
 * Lists all problems from all files, sorted by severity.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.diagnostics",
  previewRenderer: "preview.codeHighlighted",
})
export class DiagnosticsFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

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

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const index = parseInt(identifier, 10);
    const diagnostics = await this.getAllDiagnostics();
    const selected = diagnostics[index];

    if (!selected) {
      return {
        content: {
          path: "",
          kind: "text",
          text: "No diagnostic selected",
        },
        language: "plaintext",
      };
    }

    const filePath = selected.uri.fsPath;
    const language = resolvePathExt(filePath);
    const highlightLine = selected.line - 1;

    const content = await FileReader.read(filePath);

    return {
      content: {
        path: filePath,
        kind: "text",
        text: content as string,
      },
      language,
      metadata: {
        highlightLine,
      },
    };
  }

  /**
   * Gets all diagnostics from the workspace
   */
  private async getAllDiagnostics(): Promise<DiagnosticData[]> {
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
