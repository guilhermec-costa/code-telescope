import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { FileFinderData } from "../../../shared/exchange/file-search";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";
import { getSvgIconUrl, resolvePathExt } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileContentCache } from "../common/cache/file-content.cache";
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

  async querySelectableOptions() {
    const files = await this.getWorkspaceFiles();

    return files.reduce<FileFinderData>(
      (result, file) => {
        result.abs.push(file.path);
        result.relative.push(vscode.workspace.asRelativePath(file.path));
        result.svgIconUrl.push(getSvgIconUrl(file.fsPath));
        return result;
      },
      { abs: [], relative: [], svgIconUrl: [] },
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
    const ext = resolvePathExt(identifier);
    const isImg = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

    const content = await FileContentCache.instance.get(identifier);

    if (isImg) {
      return {
        content: {
          kind: "image",
          path: identifier,
          buffer: content as Uint8Array,
          mimeType: `image/${ext === "jpg" ? "jpeg" : ext}`,
          isCached: false,
        },
        language: ext,
        overridePreviewer: "preview.image",
      };
    }

    return {
      content: {
        kind: "text",
        path: identifier,
        text: content as string,
        isCached: false,
      },
      language: ext,
      overridePreviewer: this.previewAdapterType,
    };
  }
}
