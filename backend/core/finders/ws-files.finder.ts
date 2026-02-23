import path from "node:path";
import * as fg from "fast-glob";
import fs from "fs";
import * as vscode from "vscode";
import { FileFinderData } from "../../../shared/exchange/file-search";
import { ImagePreviewData, TextPreviewData } from "../../../shared/extension-webview-protocol";
import { DEFAULT_EXCLUDE_PATTERNS } from "../../config/exclude-patterns";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";
import { getLanguageIdForFile, resolvePathExt } from "../../utils/files";
import { ChunkableProvider } from "../abstractions/chunkable-provider";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileReader } from "../common/cache/file-reader";
import { ExtensionConfigManager } from "../common/config-manager";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";
import { RipgrepFileFinder } from "./ripgrep-file.finder";

@FuzzyFinderAdapter({
  fuzzy: "workspace.files",
  previewRenderer: "preview.buffer",
  dataAdapter: "workspaceFilesAdapter",
})
export class WorkspaceFileFinder implements FuzzyFinderProvider, ChunkableProvider<FileFinderData> {
  public readonly chunkSize = 5500;
  public readonly concurrency = 16;
  private static rgFileFinder = new RipgrepFileFinder();

  async querySelectableOptions() {
    return await this.getWorkspaceFiles();
  }

  public async *queryStream(): AsyncGenerator<string[]> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return;

    if (folders.length === 1) {
      const rootPath = folders[0].uri.fsPath;
      yield* WorkspaceFileFinder.rgFileFinder.ripgrepAvailable
        ? WorkspaceFileFinder.rgFileFinder.streamFiles(rootPath)
        : this.streamWithFastGlob(rootPath);
      return;
    }

    // paralelo: cria um generator por folder e faz merge
    const queue: string[][] = [];
    let resolveNext: (() => void) | null = null;
    let done = 0;

    const enqueue = (chunk: string[]) => {
      queue.push(chunk);
      resolveNext?.();
      resolveNext = null;
    };

    // dispara todos os folders em paralelo
    const runners = folders.map(async (folder) => {
      const rootPath = folder.uri.fsPath;
      const gen = WorkspaceFileFinder.rgFileFinder.ripgrepAvailable
        ? WorkspaceFileFinder.rgFileFinder.streamFiles(rootPath)
        : this.streamWithFastGlob(rootPath);

      for await (const chunk of gen) {
        enqueue(chunk);
      }
      done++;
      resolveNext?.();
      resolveNext = null;
    });

    // não awaita — deixa rodar em background
    Promise.all(runners).catch(console.error);

    const total = folders.length;

    while (done < total || queue.length > 0) {
      while (queue.length > 0) {
        yield queue.shift()!;
      }

      if (done < total) {
        await new Promise<void>((res) => {
          resolveNext = res;
        });
      }
    }
  }

  private async *streamWithFastGlob(rootPath: string): AsyncGenerator<string[]> {
    const { excludePatterns, excludeHidden, includePatterns, maxResults } = ExtensionConfigManager.wsFileFinderCfg;

    const ignore = [...excludePatterns, ...DEFAULT_EXCLUDE_PATTERNS];
    if (excludeHidden) ignore.push("**/.*");
    const entries = includePatterns.length > 0 ? includePatterns : ["**/*"];

    let count = 0;
    let currentChunk: string[] = [];

    const stream = fg.stream(entries, {
      cwd: rootPath,
      ignore,
      absolute: true,
      dot: !excludeHidden,
      onlyFiles: true,
      suppressErrors: true,
      followSymbolicLinks: false,
    });

    for await (const entry of stream) {
      currentChunk.push(entry as string);
      count++;

      if (currentChunk.length === this.chunkSize) {
        yield currentChunk;
        currentChunk = [];
      }

      if (maxResults && count >= maxResults) {
        if (currentChunk.length > 0) yield currentChunk;
        return;
      }
    }

    if (currentChunk.length > 0) yield currentChunk;
  }

  public mapChunk(files: string[]): FileFinderData {
    return files.reduce<FileFinderData>(
      (result, fileEntry) => {
        result.abs.push(fileEntry);
        result.relative.push(vscode.workspace.asRelativePath(fileEntry));
        return result;
      },
      { abs: [], relative: [] },
    );
  }

  async onSelect(filePath: string) {
    const uri = vscode.Uri.file(filePath);
    await execCmd(Globals.cmds.openFile, uri);
  }

  public async getWorkspaceFiles(): Promise<string[]> {
    const { excludePatterns, excludeHidden, includePatterns, maxResults } = ExtensionConfigManager.wsFileFinderCfg;
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return [];
    const includes = includePatterns.length > 0 ? includePatterns : ["**/*"];
    const excludes = [...excludePatterns, ...DEFAULT_EXCLUDE_PATTERNS];
    if (excludeHidden) excludes.push("**/.*");
    const includeGlob = includes.length === 1 ? includes[0] : `{${includes.join(",")}}`;
    const excludeGlob = excludes.length > 0 ? `{${excludes.join(",")}}` : undefined;
    const uris = await vscode.workspace.findFiles(includeGlob, excludeGlob, maxResults);
    return uris.map((uri) => uri.fsPath);
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData | ImagePreviewData> {
    const ext = resolvePathExt(identifier);
    const isImg = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

    // resolve o caminho absoluto a partir do workspace
    // const absPath = this.resolveAbsolutePath(identifier);
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

  private resolveAbsolutePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) return relativePath;

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return relativePath;

    for (const folder of folders) {
      const folderName = path.basename(folder.uri.fsPath);
      const stripped = relativePath.startsWith(folderName + path.sep)
        ? relativePath.slice(folderName.length + 1)
        : relativePath;

      const candidate = path.join(folder.uri.fsPath, stripped);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    // fallback
    return path.join(folders[0].uri.fsPath, relativePath);
  }

  private get casted() {
    return this as unknown as IFuzzyFinderProvider;
  }
}
