import * as fs from "fs";
import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { RecentFileData, RecentFilesFinderData } from "../../../shared/exchange/recent-files";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";
import { getLanguageIdForFile, getSvgIconUrl } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileReader } from "../common/cache/file-reader";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider that retrieves recently opened files.
 *
 * Uses VS Code's recently opened files API and filters out non-existent files.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.recentFiles",
  previewRenderer: "preview.codeHighlighted",
})
export class RecentFilesFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  async querySelectableOptions(): Promise<RecentFilesFinderData> {
    const files = await this.getRecentFiles();

    const { displayTexts, svgIconUrls } = files.reduce<{ displayTexts: string[]; svgIconUrls: string[] }>(
      (acc, f) => {
        acc.displayTexts.push(f.relativePath.padEnd(50));
        acc.svgIconUrls.push(getSvgIconUrl(f.path));
        return acc;
      },
      { displayTexts: [], svgIconUrls: [] },
    );

    return {
      files,
      displayTexts,
      svgIconUrls,
    };
  }

  async onSelect(path: string) {
    const uri = vscode.Uri.file(path);
    await execCmd(Globals.cmds.openFile, uri);
  }

  async getPreviewData(path: string): Promise<HighlightedCodePreviewData> {
    const content = await FileReader.read(path);

    return {
      content: {
        path: path,
        text: content as string,
        kind: "text",
      },
      language: await getLanguageIdForFile(path),
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
}
