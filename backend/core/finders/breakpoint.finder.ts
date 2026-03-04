import { BreakpointData, BreakpointsFinderData } from "@shared/exchange/breakpoint";
import * as vscode from "vscode";
import { TextPreviewData } from "../../../shared/extension-webview-protocol";
import { getLanguageIdForFile } from "../../utils/files";
import { FileReader } from "../common/file-reader";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider for debugging breakpoints
 *
 * Lists all breakpoints across the workspace with their locations,
 * conditions, and states. Allows quick navigation to breakpoint locations.
 */
@FuzzyFinderAdapter({
  fuzzy: "debug.breakpoints",
  previewRenderer: "preview.buffer",
  dataAdapter: "debugBreakpointsAdapter",
  name: "Breakpoints",
  description: "View and manage debugging breakpoints",
})
export class BreakpointsFinder implements FuzzyFinderProvider {
  async querySelectableOptions(): Promise<BreakpointsFinderData> {
    const breakpoints = this.getAllBreakpoints();

    const displayTexts = breakpoints.map((bp) => {
      const relativePath = vscode.workspace.asRelativePath(bp.uri);
      const location = `${relativePath}:${bp.line + 1}`;
      const status = bp.enabled ? "●" : "○";

      let extras: string[] = [];
      if (bp.condition) {
        extras.push(`condition: ${bp.condition}`);
      }
      if (bp.hitCondition) {
        extras.push(`hits: ${bp.hitCondition}`);
      }
      if (bp.logMessage) {
        extras.push(`log: ${bp.logMessage}`);
      }

      const extrasStr = extras.length > 0 ? ` [${extras.join(", ")}]` : "";

      return `${status} ${location}${extrasStr}`;
    });

    return {
      breakpoints,
      displayTexts,
    };
  }

  async onSelect(selectedIndex: string) {
    const index = parseInt(selectedIndex, 10);
    const breakpoints = this.getAllBreakpoints();
    const selected = breakpoints[index];

    if (!selected) return;

    try {
      const document = await vscode.workspace.openTextDocument(selected.uri);
      const editor = await vscode.window.showTextDocument(document);

      const position = new vscode.Position(selected.line, selected.column ?? 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open breakpoint location: ${error}`);
    }
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData> {
    const index = parseInt(identifier, 10);
    const breakpoints = this.getAllBreakpoints();
    const selected = breakpoints[index];

    if (!selected) {
      return {
        content: "No breakpoint selected",
        kind: "text",
        language: "plaintext",
      };
    }

    const filePath = selected.uri.fsPath;
    const highlightLine = selected.line;

    try {
      const content = await FileReader.read(filePath);

      return {
        content: content as string,
        kind: "text",
        language: getLanguageIdForFile(filePath),
        metadata: {
          highlightLine,
        },
      };
    } catch (error) {
      return {
        content: `Error loading file: ${error}`,
        kind: "text",
        language: "plaintext",
      };
    }
  }

  private getAllBreakpoints(): BreakpointData[] {
    const allBreakpoints = vscode.debug.breakpoints;
    const result: BreakpointData[] = [];

    for (const bp of allBreakpoints) {
      if (bp instanceof vscode.SourceBreakpoint) {
        const location = bp.location;

        result.push({
          id: bp.id,
          uri: location.uri,
          line: location.range.start.line,
          column: location.range.start.character,
          condition: bp.condition,
          hitCondition: bp.hitCondition,
          logMessage: bp.logMessage,
          enabled: bp.enabled,
        });
      }
    }

    // Sort by file path, then by line number
    result.sort((a, b) => {
      const pathCompare = a.uri.fsPath.localeCompare(b.uri.fsPath);
      if (pathCompare !== 0) return pathCompare;
      return a.line - b.line;
    });

    return result;
  }
}
