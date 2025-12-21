import { FileFinderData } from "@shared/exchange/file-search";
import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";
import { findWorkspaceFiles, getLanguageFromPath, relativizeFilePath } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileContentCache } from "../common/cache/file-content.cache";
import { HighlightContentCache } from "../common/cache/highlight-content.cache";
import { ExtensionConfigManager } from "../common/config-manager";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider that retrieves files from the current workspace.
 *
 * This provider allows filtering files using include/exclude patterns,
 * hiding dotfiles, and limiting the maximum number of results.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.files",
  previewRenderer: "preview.codeHighlighted",
})
export class WorkspaceFileFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  getHtmlLoadConfig() {
    return {
      fileName: "file-fuzzy.view.html",
      placeholders: {
        "{{style}}": "ui/style/style.css",
        "{{script}}": "ui/dist/index.js",
      },
    };
  }

  /**
   * Returns the list of file paths to display in the fuzzy finder.
   */
  async querySelectableOptions() {
    const files = await this.getWorkspaceFiles();

    return files.reduce<FileFinderData>(
      (result, file) => {
        result.abs.push(file.path);
        result.relative.push(relativizeFilePath(file.path));
        return result;
      },
      { abs: [], relative: [] },
    );
  }

  /**
   * Opens the selected file in VS Code when the user chooses an item.
   */
  async onSelect(filePath: string) {
    const uri = vscode.Uri.file(filePath);
    await execCmd(Globals.cmds.openFile, uri);
  }

  /**
   * Executes the search for workspace files based on configured patterns.
   * Merges exclude patterns and optionally filters out hidden files.
   */
  private async getWorkspaceFiles() {
    const { excludePatterns, excludeHidden, includePatterns, maxResults } = ExtensionConfigManager.wsFileFinderCfg;

    const excludes = [...excludePatterns];
    if (excludeHidden) excludes.push("**/.*");

    const results: vscode.Uri[] = [];

    await Promise.all(
      includePatterns.map(async (pattern) => {
        const found = await findWorkspaceFiles(pattern, `{${excludes.join(",")}}`, maxResults);
        results.push(...found);
      }),
    );

    return results;
  }

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const language = getLanguageFromPath(identifier);

    const cachedHighlightedContent = HighlightContentCache.instance.get(identifier);
    if (cachedHighlightedContent) {
      return {
        content: { path: identifier, text: cachedHighlightedContent, isCached: true },
        language,
      };
    }

    const content = await FileContentCache.instance.get(identifier);
    return {
      content: {
        path: identifier,
        text: content,
        isCached: false,
      },
      language,
    };
  }
}
