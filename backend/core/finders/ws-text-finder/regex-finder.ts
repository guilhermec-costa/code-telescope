import * as vscode from "vscode";
import { TextSearchMatch } from "../../../../shared/exchange/workspace-text-search";
import { ExtensionConfigManager } from "../../common/config-manager";
import { FileReader } from "../../common/file-reader";
import { WorkspaceFileFinder } from "../file/ws-files.finder";

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Workspace text search provider that scans workspace files
 * using a regular expression-based approach.
 */
export class RegexFinder {
  public async search(query: string, signal?: AbortSignal): Promise<any> {
    const matches: TextSearchMatch[] = [];
    const { maxResults, maxFileSize } = ExtensionConfigManager.wsTextFinderCfg;
    const BATCH_SIZE = 25;

    const queryRegex = new RegExp(escapeRegExp(query), "gi");

    try {
      const wsFileFinder = new WorkspaceFileFinder();
      const uris = await wsFileFinder.getWorkspaceFiles();

      for (let i = 0; i < uris.length; i += BATCH_SIZE) {
        if (signal?.aborted || matches.length >= maxResults) break;

        const batch = uris.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (uri) => {
            if (signal?.aborted || matches.length >= maxResults) return;

            try {
              const stat = await vscode.workspace.fs.stat(vscode.Uri.file(uri));
              if (stat.size > parseFileSize(maxFileSize) || signal?.aborted) return;
              const content = (await FileReader.read(uri)) as string;
              if (signal?.aborted) return;
              queryRegex.lastIndex = 0;

              const match = queryRegex.exec(content);

              if (match) {
                const matchIndex = match.index;
                const lineStart = content.lastIndexOf("\n", matchIndex) + 1;

                let lineEnd = content.indexOf("\n", matchIndex);
                if (lineEnd === -1) lineEnd = content.length;

                const lineContent = content.substring(lineStart, lineEnd);

                if (lineContent.length > 500) return;

                let lineNumber = 1;
                for (let k = 0; k < lineStart; k++) {
                  if (content[k] === "\n") lineNumber++;
                }

                matches.push({
                  file: uri,
                  line: lineNumber,
                  column: matchIndex - lineStart + 1,
                  text: lineContent.trim(),
                  preview: lineContent.trim(),
                });
              }
            } catch (_e) {
              // only ignore
            }
          }),
        );
      }

      return {
        results: matches,
        query: query,
        message: matches.length === 0 ? "No results found" : undefined,
      };
    } catch (error) {
      console.error("Fallback search error:", error);
      return { results: [], query, message: "Error during search" };
    }
  }
}

function parseFileSize(value: string): number {
  const match = /^\s*(\d+(?:\.\d+)?)\s*([kmgt]?)b?\s*$/i.exec(value);
  if (!match) return 200 * 1024;
  const multiplier = { "": 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3, t: 1024 ** 4 }[match[2].toLowerCase()]!;
  return Number(match[1]) * multiplier;
}
