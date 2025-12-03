import * as vscode from "vscode";
import { Globals } from "../globals";
import { execCmd } from "../utils/commands";
import { findWorkspaceFiles, loadWebviewHtml, relativizeFilePath } from "../utils/files";
import { FuzzyProvider } from "./fuzzy-provider";

/**
 * Fuzzy provider that retrieves files from the current workspace.
 *
 * This provider allows filtering files using include/exclude patterns,
 * hiding dotfiles, and limiting the maximum number of results.
 */
export class WorkspaceFileFinder implements FuzzyProvider {
  public readonly type = "workspace-file-finder";

  constructor(
    private readonly panel: vscode.WebviewPanel,
    private overrideConfig?: Partial<FinderSearchConfig>,
  ) {}

  async loadWebviewHtml() {
    let rawHtml = await loadWebviewHtml("media-src", "views", "file-fuzzy.view.html");

    const replace = (search: string, distPath: string) => {
      const fullUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(Globals.EXTENSION_URI, distPath));
      rawHtml = rawHtml.replace(search, fullUri.toString());
    };

    replace("{{style}}", "media-src/style/style.css");
    replace("{{script}}", "media-dist/index.js");
    return rawHtml;
  }

  /**
   * Returns the list of file paths to display in the fuzzy finder.
   */
  async querySelectableOptions() {
    const cfg = this.getFinderConfig();
    const files = await this.getWorkspaceFiles(cfg);

    // Retorna no formato esperado pelo FileFinderAdapter
    return files.reduce<{ abs: string[]; relative: string[] }>(
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
    const cfg = vscode.workspace.getConfiguration(`${Globals.EXTENSION_CONFIGURATION_PREFIX_NAME}.finder`);

    const baseConfig: FinderSearchConfig = {
      excludeHidden: cfg.get("excludeHidden", true),
      includePatterns: cfg.get("includePatterns", ["**/*"]),
      excludePatterns: cfg.get("excludePatterns", ["**/node_modules/**"]),
      maxResults: cfg.get("maxResults", 2000),
      asRelativePath: cfg.get("asRelativePath", true),
    };

    return {
      ...baseConfig,
      ...this.overrideConfig,
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

type FindResult = {
  relative: string[];
  absolute: string[];
};
