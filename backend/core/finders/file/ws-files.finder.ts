import * as fg from "fast-glob";
import * as vscode from "vscode";
import { IFuzzyFinderProvider } from "../../../../shared/abstractions/fuzzy-finder.provider";
import { FileFinderData } from "../../../../shared/exchange/file-search";
import { ImagePreviewData, TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { DEFAULT_EXCLUDE_PATTERNS } from "../../../config/exclude-patterns";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";
import { resolvePathExt } from "../../../utils/files";
import { ChunkableProvider } from "../../abstractions/chunkable-provider";
import { ExtensionConfigManager } from "../../common/config-manager";
import { FileReader } from "../../common/file-reader";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";
import { RipgrepFileFinder } from "./ripgrep-file.finder";

@FuzzyFinderAdapter({
  fuzzy: "workspace.files",
  previewRenderer: "preview.buffer",
  dataAdapter: "workspaceFilesAdapter",
  name: "Workspace Files",
  description: "Search for files in your workspace",
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

    const queue: string[][] = [];

    // wake up the infinite loop
    let resolveNext: (() => void) | null = null;
    let done = 0;

    const enqueue = (chunk: string[]) => {
      queue.push(chunk);
      resolveNext?.();
      resolveNext = null;
    };

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

    Promise.all(runners).catch(console.error);

    const total = folders.length;

    // should only run while there are either items in the queue or active runners
    while (done < total || queue.length > 0) {
      // immediately dispatch the chunk to the consumer
      while (queue.length > 0) {
        yield queue.shift()!;
      }

      // if queue is empty, but there's still active runners
      if (done < total) {
        // when this condition fails, the stackframe pops off, and the generator ends
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
        result.relative.push(vscode.workspace.asRelativePath(fileEntry));
        result.abs.push(fileEntry);
        return result;
      },
      { relative: [], abs: [] },
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
    const isImg = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext);

    const content = await FileReader.read(identifier);

    if (isImg) {
      return {
        content: {
          buffer: content as Uint8Array,
          mimeType: ext === "jpg" ? "image/jpeg" : ext === "svg" ? "image/svg+xml" : `image/${ext}`,
        },
        kind: "image",
        overridePreviewer: "preview.image",
      };
    }
    return {
      kind: "text",
      content: content as string,
      metadata: {
        filePath: identifier,
      },
    };
  }

  private get casted() {
    return this as unknown as IFuzzyFinderProvider;
  }
}
