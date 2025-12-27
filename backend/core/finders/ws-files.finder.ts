import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { FileFinderData } from "../../../shared/exchange/file-search";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";
import { getLanguageFromPath } from "../../utils/files";
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

  async querySelectableOptions() {
    const files = await this.getWorkspaceFiles();

    return files.reduce<FileFinderData>(
      (result, file) => {
        result.abs.push(file.path);
        result.relative.push(vscode.workspace.asRelativePath(file.path));
        return result;
      },
      { abs: [], relative: [] },
    );
  }

  async onSelect(filePath: string) {
    const uri = vscode.Uri.file(filePath);
    await execCmd(Globals.cmds.openFile, uri);
  }

  /**
   * Executes the search for workspace files based on configured patterns.
   * Merges exclude patterns and optionally filters out hidden files.
   */
  public async getWorkspaceFiles() {
    const { excludePatterns, excludeHidden, includePatterns, maxResults } = ExtensionConfigManager.wsFileFinderCfg;

    const excludes = [...excludePatterns];
    if (excludeHidden) excludes.push("**/.*");

    const include = includePatterns.length === 1 ? includePatterns[0] : `{${includePatterns.join(",")}}`;

    return vscode.workspace.findFiles(include, `{${excludes.join(",")}}`, maxResults);
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
