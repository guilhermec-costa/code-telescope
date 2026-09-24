import * as fs from "fs";
import * as vscode from "vscode";
import { RecentFileData, RecentFilesFinderData } from "../../../../shared/exchange/recent-files";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";
import { FileReader } from "../../common/file-reader";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider that retrieves recently opened files.
 *
 * Uses VS Code's recently opened files API and filters out non-existent files.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.recentFiles",
  previewRenderer: "preview.buffer",
  dataAdapter: "workspaceRecentFilesAdapter",
  name: "Recent Files",
  description: "Browse recently opened files",
})
export class RecentFilesFinder implements FuzzyFinderProvider {
  private static readonly TERMINAL_PREFIX = "terminal://";

  async querySelectableOptions(): Promise<RecentFilesFinderData> {
    const files = await this.getRecentFiles();

    const { displayTexts } = files.reduce<{ displayTexts: string[] }>(
      (acc, f) => {
        acc.displayTexts.push(f.relativePath.padEnd(50));
        return acc;
      },
      { displayTexts: [] },
    );

    return {
      files,
      displayTexts,
    };
  }

  async onSelect(path: string) {
    if (this.isTerminalSelection(path)) {
      const terminal = this.findTerminalBySelection(path);
      if (terminal) {
        terminal.show();
      }
      return;
    }

    const uri = vscode.Uri.file(path);
    await execCmd(Globals.cmds.openFile, uri);
  }

  async getPreviewData(path: string): Promise<TextPreviewData> {
    if (this.isTerminalSelection(path)) {
      return {
        content: "Terminal preview is not available.",
        kind: "text",
        language: "plaintext",
      };
    }

    const content = await FileReader.read(path);

    return {
      content: content as string,
      kind: "text",
      metadata: {
        filePath: path,
      },
    };
  }

  /**
   * Gets recently opened files from VS Code's tab groups
   */
  private async getRecentFiles(): Promise<RecentFileData[]> {
    const recentFiles = new Map<string, RecentFileData>();

    const tabGroups = vscode.window.tabGroups.all;

    for (const group of tabGroups) {
      for (const tab of group.tabs) {
        const input = tab.input as any;

        if (input instanceof vscode.TabInputTerminal) {
          const terminalId = this.buildTerminalSelection(tab.label);

          if (recentFiles.has(terminalId)) continue;

          recentFiles.set(terminalId, {
            kind: "terminal",
            path: terminalId,
            relativePath: `[Terminal] ${tab.label}`,
            lastModified: new Date(),
            exists: true,
          });
          continue;
        }

        if (input && "uri" in input && input.uri instanceof vscode.Uri) {
          const uri = input.uri;
          if (uri.scheme !== "file") continue;
          const filePath = uri.fsPath;

          if (recentFiles.has(filePath)) continue;

          const exists = fs.existsSync(filePath);

          let lastModified = new Date();
          if (exists) {
            try {
              const stats = fs.statSync(filePath);
              lastModified = stats.mtime;
            } catch {}
          }

          recentFiles.set(filePath, {
            kind: "file",
            path: filePath,
            relativePath: vscode.workspace.asRelativePath(filePath),
            lastModified,
            exists,
          });
        }
      }
    }

    const filesArray = Array.from(recentFiles.values());
    filesArray.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    return filesArray;
  }

  private buildTerminalSelection(label: string): string {
    return `${RecentFilesFinder.TERMINAL_PREFIX}${encodeURIComponent(label)}`;
  }

  private isTerminalSelection(selection: string): boolean {
    return selection.startsWith(RecentFilesFinder.TERMINAL_PREFIX);
  }

  private findTerminalBySelection(selection: string): vscode.Terminal | undefined {
    const label = decodeURIComponent(selection.slice(RecentFilesFinder.TERMINAL_PREFIX.length));
    return vscode.window.terminals.find((terminal) => terminal.name === label);
  }
}
