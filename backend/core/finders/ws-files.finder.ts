import * as fg from "fast-glob";
import * as vscode from "vscode";
import { FileFinderData } from "../../../shared/exchange/file-search";
import { ImagePreviewData, TextPreviewData } from "../../../shared/extension-webview-protocol";
import { DEFAULT_EXCLUDE_PATTERNS } from "../../config/exclude-patterns";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";
import { getLanguageIdForFile, getSvgIconUrl, resolvePathExt } from "../../utils/files";
import { ChunkableProvider } from "../abstractions/chunkable-provider";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileReader } from "../common/cache/file-reader";
import { ExtensionConfigManager } from "../common/config-manager";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";

@FuzzyFinderAdapter({
  fuzzy: "workspace.files",
  previewRenderer: "preview.buffer",
  dataAdapter: "workspaceFilesAdapter",
})
export class WorkspaceFileFinder implements FuzzyFinderProvider, ChunkableProvider<FileFinderData> {
  public readonly chunkSize = 3500;

  async querySelectableOptions() {
    const results = await this.getWorkspaceFiles();
    return this.mapChunk(results);
  }

  public mapChunk(files: string[]): FileFinderData {
    return files.reduce<FileFinderData>(
      (result, fileEntry) => {
        result.abs.push(fileEntry);
        result.relative.push(vscode.workspace.asRelativePath(fileEntry));
        result.svgIconUrl.push(getSvgIconUrl(fileEntry));
        return result;
      },
      { abs: [], relative: [], svgIconUrl: [] },
    );
  }

  async onSelect(filePath: string) {
    const uri = vscode.Uri.file(filePath);
    await execCmd(Globals.cmds.openFile, uri);
  }

  public async getWorkspaceFilesWSize(): Promise<string[]> {
    const { excludePatterns, excludeHidden, includePatterns, maxResults } = ExtensionConfigManager.wsFileFinderCfg;

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return [];

    const ignore = [...excludePatterns, ...DEFAULT_EXCLUDE_PATTERNS];
    if (excludeHidden) ignore.push("**/.*");

    const entries = includePatterns.length > 0 ? includePatterns : ["**/*"];

    try {
      const searchPromises = folders.map((folder) => {
        const rootPath = folder.uri.fsPath;

        return fg.default(entries, {
          cwd: rootPath,
          ignore: ignore,
          absolute: true,
          dot: !excludeHidden,
          onlyFiles: true,
          suppressErrors: true,
          followSymbolicLinks: false,
        });
      });

      const resultsPerFolder = await Promise.all(searchPromises);
      const allEntries = resultsPerFolder.flat();

      return maxResults ? allEntries.slice(0, maxResults) : allEntries;
    } catch (e) {
      console.error("Erro na busca de arquivos multi-root:", e);
      return [];
    }
  }

  public async getWorkspaceFiles(): Promise<string[]> {
    const { excludePatterns, excludeHidden, includePatterns, maxResults } = ExtensionConfigManager.wsFileFinderCfg;

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return [];

    const includes = includePatterns.length > 0 ? includePatterns : ["**/*"];
    const excludes = [...excludePatterns, ...DEFAULT_EXCLUDE_PATTERNS];

    if (excludeHidden) {
      excludes.push("**/.*");
    }

    const includeGlob = includes.length === 1 ? includes[0] : `{${includes.join(",")}}`;

    const excludeGlob = excludes.length > 0 ? `{${excludes.join(",")}}` : undefined;

    const uris = await vscode.workspace.findFiles(includeGlob, excludeGlob, maxResults);

    return uris.map((uri) => uri.fsPath);
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData | ImagePreviewData> {
    const ext = resolvePathExt(identifier);
    const isImg = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
    const content = await FileReader.read(identifier);

    if (isImg) {
      return {
        content: {
          buffer: content as Uint8Array,
          mimeType: `image/${ext === "jpg" ? "jpeg" : ext}`,
        },
        kind: "image",
        language: getLanguageIdForFile(identifier),
        overridePreviewer: "preview.image",
      };
    }

    return {
      kind: "text",
      content: content as string,
      language: getLanguageIdForFile(identifier),
      overridePreviewer: this.casted.previewAdapterType,
    };
  }

  private get casted() {
    return this as unknown as IFuzzyFinderProvider;
  }
}
