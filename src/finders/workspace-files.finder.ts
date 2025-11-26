import * as vscode from "vscode";
import { isHiddenFile } from "../utils/files";

type FinderSearchConfig = {
  blobPattern?: string;
  excludePattern?: string;
  pageSize?: number;
  includeHidden?: boolean;
};

export class WorkspaceFileFinder {
  private static readonly DEFAULT_SEARCH_CONFIG: FinderSearchConfig = {
    blobPattern: "**/*",
    excludePattern: "**/node_modules/**",
    pageSize: 100,
    includeHidden: true,
  };

  static async findFilePaths(searchConfig: FinderSearchConfig = this.DEFAULT_SEARCH_CONFIG) {
    const _files = await this.getWorkspaceFiles(searchConfig);
    const paths = _files.reduce<Array<string>>((paths, file) => {
      if (searchConfig.includeHidden) {
        paths.push(file.path);
        return paths;
      }

      if (!isHiddenFile(file.path)) paths.push(file.path);
      return paths;
    }, []);
    return paths;
  }

  private static async getWorkspaceFiles(searchConfig: FinderSearchConfig) {
    const { blobPattern, excludePattern, pageSize } = searchConfig;
    return await vscode.workspace.findFiles(blobPattern!, excludePattern, pageSize);
  }
}
