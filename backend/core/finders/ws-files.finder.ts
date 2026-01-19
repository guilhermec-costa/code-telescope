import * as fg from "fast-glob";
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
import { FuzzyFinderPanelController } from "../presentation/fuzzy-panel.controller";
import { WebviewController } from "../presentation/webview.controller";

@FuzzyFinderAdapter({
  fuzzy: "workspace.files",
  previewRenderer: "preview.codeHighlighted",
})
export class WorkspaceFileFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  async querySelectableOptions(): Promise<FileFinderData> {
    const allFiles = await this.getWorkspaceFiles();
    const CHUNK_SIZE = 1500;

    const firstChunk = this.processFileChunk(allFiles.slice(0, CHUNK_SIZE));

    if (allFiles.length > CHUNK_SIZE) {
      this.streamChunks(allFiles, CHUNK_SIZE);
    }

    return firstChunk;
  }

  private processFileChunk(files: string[]): FileFinderData {
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

  private async streamChunks(allFiles: string[], size: number) {
    for (let i = size; i < allFiles.length; i += size) {
      await new Promise((resolve) => setTimeout(resolve, 16));

      const chunk = allFiles.slice(i, i + size);
      const chunkData = this.processFileChunk(chunk);

      const panel = FuzzyFinderPanelController.instance?.webview;
      if (!panel) break;

      await WebviewController.sendMessage(panel, {
        type: "optionList",
        data: chunkData as any,
        isChunk: true,
        fuzzyProviderType: this.fuzzyAdapterType,
      });
    }
  }

  async onSelect(filePath: string) {
    const uri = vscode.Uri.file(filePath);
    await execCmd(Globals.cmds.openFile, uri);
  }

  public async getWorkspaceFiles(): Promise<string[]> {
    const { excludePatterns, excludeHidden, includePatterns, maxResults, maxFileSize } =
      ExtensionConfigManager.wsFileFinderCfg;

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return [];

    const ignore = [...excludePatterns];
    if (excludeHidden) ignore.push("**/.*");

    const entries = includePatterns.length > 0 ? includePatterns : ["**/*"];
    const maxBytes = 1024 * maxFileSize;

    try {
      const searchPromises = folders.map((folder) => {
        const rootPath = folder.uri.fsPath;

        return fg.default(entries, {
          cwd: rootPath,
          ignore: ignore,
          absolute: true,
          // stats: true, //
          dot: !excludeHidden,
          onlyFiles: true,
          suppressErrors: true,
          followSymbolicLinks: false,
        });
      });

      const resultsPerFolder = await Promise.all(searchPromises);
      const allEntries = resultsPerFolder.flat();

      // const filtered = allEntries.filter((entry) => (entry.stats?.size || 0) <= maxBytes).map((entry) => entry.path);

      return maxResults ? allEntries.slice(0, maxResults) : allEntries;
    } catch (e) {
      console.error("Erro na busca de arquivos multi-root:", e);
      return [];
    }
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
      },
      language: ext,
      overridePreviewer: this.previewAdapterType,
    };
  }
}
