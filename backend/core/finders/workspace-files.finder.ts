import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { FileFinderData } from "../../../shared/exchange/file-search";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";
import { findWorkspaceFiles, getLanguageFromPath, relativizeFilePath } from "../../utils/files";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";
import { IFuzzyFinderProvider } from "./fuzzy-finder.provider";

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

  constructor(private overrideConfig?: Partial<FinderSearchConfig>) {}

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
    const cfg = this.getFinderConfig();
    const files = await this.getWorkspaceFiles(cfg);

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
  private async getWorkspaceFiles(cfg: FinderSearchConfig) {
    const { excludePatterns, excludeHidden, includePatterns, maxResults } = cfg;

    const excludes = [...excludePatterns];
    if (excludeHidden) excludes.push("**/.*");

    const results: vscode.Uri[] = [];

    const finalExcludeGlob = `{${excludes.join(",")}}`;

    await Promise.all(
      includePatterns.map(async (pattern) => {
        const found = await findWorkspaceFiles(pattern, finalExcludeGlob, maxResults);
        results.push(...found);
      }),
    );

    return results;
  }

  /**
   * Loads the configuration for the workspace file finder from
   * the VS Code settings and merges it with any overrides.
   */
  private getFinderConfig(): FinderSearchConfig {
    const cfg = vscode.workspace.getConfiguration(`${Globals.EXTENSION_CONFIGURATION_PREFIX}.finder`);

    const baseConfig: FinderSearchConfig = {
      excludeHidden: cfg.get("excludeHidden", true),
      includePatterns: cfg.get("includePatterns", ["**/*"]),
      excludePatterns: cfg.get("excludePatterns", ["**/node_modules/**"]),
      maxResults: cfg.get("maxResults", 50000),
      asRelativePath: cfg.get("asRelativePath", true),
    };

    return {
      ...baseConfig,
      ...this.overrideConfig,
    };
  }

  async getPreviewData(identifier: string): Promise<PreviewData> {
    const contentBytes = await vscode.workspace.fs.readFile(vscode.Uri.file(identifier));
    const content = new TextDecoder("utf8").decode(contentBytes);
    const language = getLanguageFromPath(identifier);
    return {
      content,
      language,
    };
  }
}

/**
 * Configuration object used to control how workspace files are searched.
 */
type FinderSearchConfig = {
  /** Glob patterns of files/directories to include. */
  includePatterns: string[];

  /** Glob patterns of files/directories to exclude. */
  excludePatterns: string[];

  /** Maximum number of file results returned by the search. */
  maxResults: number;

  /** Whether hidden files (dotfiles) should be excluded automatically. */
  excludeHidden: boolean;

  /** Whether to get files as relative paths */
  asRelativePath: boolean;
};
