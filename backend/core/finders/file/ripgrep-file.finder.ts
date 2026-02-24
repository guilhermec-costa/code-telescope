import path from "path";
import { DEFAULT_EXCLUDE_PATTERNS } from "../../../config/exclude-patterns";
import { ExtensionConfigManager } from "../../common/config-manager";
import { RipgrepAvailability } from "../../common/rg/rg-availability";
import { RipgrepLineStreamer } from "../../common/rg/rg-line-streamer";

export class RipgrepFileFinder {
  async initialize() {
    await RipgrepAvailability.ensure();
  }

  get ripgrepAvailable() {
    return RipgrepAvailability.available;
  }

  public async *streamFiles(rootPath: string): AsyncGenerator<string[]> {
    const { excludePatterns, excludeHidden, includePatterns, maxResults } = ExtensionConfigManager.wsFileFinderCfg;

    const args: string[] = ["--files"];
    for (const pattern of includePatterns) args.push("--glob", pattern);
    const excludes = [...excludePatterns, ...DEFAULT_EXCLUDE_PATTERNS];
    for (const pattern of excludes) args.push("--glob", `!${pattern}`);
    if (!excludeHidden) args.push("--hidden");
    args.push("--no-ignore", "--", rootPath);

    for await (const rawChunk of RipgrepLineStreamer.stream({
      rgPath: RipgrepAvailability.rgPath,
      args,
      cwd: rootPath,
      firstChunkSize: 100,
      chunkSize: 80000,
      maxResults,
    })) {
      yield rawChunk.map((line) => (path.isAbsolute(line) ? line : path.join(rootPath, line)));
    }
  }
}
