import * as vscode from "vscode";
import { Globals } from "../globals";
import { findWorkspaceFiles } from "../utils/files";
import { FuzzyProvider } from "./fuzzy-provider";

export class WorkspaceFileFinder implements FuzzyProvider {
  constructor(private overrideConfig?: Partial<FinderSearchConfig>) {}

  async findSelectableOptions(): Promise<string[]> {
    const cfg = this.getFinderConfig();
    const files = await this.getWorkspaceFiles(cfg);
    return files.map((f) => f.path);
  }

  async onSelect(filePath: string) {
    const uri = vscode.Uri.file(filePath);
    await vscode.commands.executeCommand("vscode.open", uri);
  }

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

  private getFinderConfig(): FinderSearchConfig {
    const cfg = vscode.workspace.getConfiguration(`${Globals.EXTENSION_CONFIGURATION_PREFIX_NAME}.finder`);

    const baseConfig: FinderSearchConfig = {
      excludeHidden: cfg.get("excludeHidden", true),
      includePatterns: cfg.get("includePatterns", ["**/*"]),
      excludePatterns: cfg.get("excludePatterns", ["**/node_modules/**"]),
      maxResults: cfg.get("maxResults", 2000),
    };

    return {
      ...baseConfig,
      ...this.overrideConfig,
    };
  }
}

export type FinderSearchConfig = {
  includePatterns: string[];
  excludePatterns: string[];
  maxResults: number;
  excludeHidden: boolean;
};
