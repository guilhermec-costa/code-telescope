import * as fs from "fs/promises";
import { TextSearchMatch } from "../../../../shared/exchange/workspace-text-search";
import { WorkspaceFileFinder } from "../ws-files.finder";

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Workspace text search provider that scans workspace files
 * using a regular expression-based approach.
 */
export class RegexFinder {
  public async search(query: string): Promise<any> {
    const matches: TextSearchMatch[] = [];
    const MAX_RESULTS = 200;
    const BATCH_SIZE = 50;

    const queryRegex = new RegExp(escapeRegExp(query), "gi");

    try {
      const wsFileFinder = new WorkspaceFileFinder();
      const uris = await wsFileFinder.getWorkspaceFiles();

      for (let i = 0; i < uris.length; i += BATCH_SIZE) {
        if (matches.length >= MAX_RESULTS) break;

        const batch = uris.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (uri) => {
            if (matches.length >= MAX_RESULTS) return;

            try {
              const stat = await fs.stat(uri.fsPath);
              // files > 300kb
              if (stat.size > 300 * 1024) return;

              const content = await fs.readFile(uri.fsPath, "utf-8");
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
                  file: uri.fsPath,
                  line: lineNumber,
                  column: matchIndex - lineStart + 1,
                  text: lineContent.trim(),
                  preview: lineContent.trim(),
                });
              }
            } catch (_e) {
              // Ignorar erros de leitura de arquivo
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
