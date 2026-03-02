import path from "path";
import * as vscode from "vscode";
import { TextSearchMatch } from "../../../../shared/exchange/workspace-text-search";
import { DEFAULT_EXCLUDE_PATTERNS } from "../../../config/exclude-patterns";
import { ExtensionConfigManager } from "../config-manager";
import { RipgrepAvailability } from "./rg-availability";
import { RipgrepLineStreamer } from "./rg-line-streamer";
import { RipgrepArgsBuilder } from "./ripgrep-args.builder";

export class RipgrepTextFinder {
  constructor() {
    RipgrepAvailability.ensure();
  }

  get ripgrepAvailable() {
    return RipgrepAvailability.available;
  }

  public async search(query: string, customPaths?: string[]) {
    const matches: TextSearchMatch[] = [];
    for await (const chunk of this.searchStream(query, customPaths)) {
      matches.push(...chunk);
    }
    return { results: matches, query };
  }

  public async *searchStream(
    query: string,
    customPaths?: string[],
    signal?: AbortSignal,
  ): AsyncGenerator<TextSearchMatch[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const roots = customPaths ?? workspaceFolders.map((f) => f.uri.fsPath);
    const cwd = workspaceFolders[0].uri.fsPath;
    const searchCfg = ExtensionConfigManager.wsTextFinderCfg;

    const _args = new RipgrepArgsBuilder()
      .query(query)
      .maxColumns(searchCfg.maxColumns)
      .maxFileSize(searchCfg.maxFileSize)
      .exclude([...searchCfg.excludePatterns, ...DEFAULT_EXCLUDE_PATTERNS]);

    if (searchCfg.fixedStrings) _args.withFixedStrings();

    const args = _args.withPaths(roots).build();

    for await (const rawChunk of RipgrepLineStreamer.stream({
      rgPath: RipgrepAvailability.rgPath,
      args,
      cwd,
      maxResults: searchCfg.maxResults,
      backpressureBufSize: 5000,
      customChunkSzResolver(isFirstChunk: boolean, curCount: number) {
        // for low TTFB
        if (isFirstChunk) return 100;
        return 12_000;
      },
      signal,
    })) {
      const matches: TextSearchMatch[] = [];

      for (const line of rawChunk) {
        try {
          const result = JSON.parse(line);
          if (result.type !== "match") continue;

          const data = result.data;
          const lineText = data.lines.text.trim();
          const rawPath = data.path.text;
          const resolvedPath = path.isAbsolute(rawPath) ? path.normalize(rawPath) : path.resolve(cwd, rawPath);

          matches.push({
            file: resolvedPath,
            line: data.line_number,
            column: data.submatches[0]?.start || 1,
            text: lineText,
            preview: lineText,
          });
        } catch {}
      }

      if (matches.length > 0) yield matches;
    }
  }
}
