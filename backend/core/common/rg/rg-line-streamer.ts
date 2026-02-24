import { spawn } from "child_process";

type DefaultChunkingOptions = {
  firstChunkSize?: number;
  backpressureBufSize?: number;
  customChunkSzResolver?: never;
};

type CustomChunkingOptions = {
  customChunkSzResolver: (_isFirstChunk: boolean, curCount: number) => number;
  firstChunkSize?: never;
  backpressureBufSize?: number;
};

export type RipgrepLineStreamerOptions = {
  rgPath: string;
  args: string[];
  cwd: string;
  maxResults?: number;
  signal?: AbortSignal;
} & (DefaultChunkingOptions | CustomChunkingOptions);

export class RipgrepLineStreamer {
  static async *stream(opts: RipgrepLineStreamerOptions): AsyncGenerator<string[]> {
    const {
      signal,
      rgPath,
      args,
      cwd,
      customChunkSzResolver,
      maxResults,
      backpressureBufSize = 8000,
      firstChunkSize = 100,
    } = opts;

    const rg = spawn(rgPath, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    signal?.addEventListener("abort", () => {
      rg.kill();
    });

    const closePromise = new Promise<void>((res) => rg.on("close", res));

    const MAX_BUFFER_LINES = backpressureBufSize * 2;
    const lines: string[] = [];
    let buffer = "";
    let done = false;
    let resolveNext: (() => void) | null = null;

    rg.stdout.on("data", (data: Buffer) => {
      buffer += data.toString("utf-8");
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        const trimmed = line.trim();
        if (trimmed) lines.push(trimmed);
      }
      if (lines.length >= MAX_BUFFER_LINES) rg.stdout.pause();
      resolveNext?.();
      resolveNext = null;
    });

    rg.stdout.on("end", () => {
      if (buffer.trim()) lines.push(buffer.trim());
      buffer = "";
      done = true;
      resolveNext?.();
      resolveNext = null;
    });

    rg.on("error", (err) => {
      console.error("rg error:", err);
      done = true;
      resolveNext?.();
      resolveNext = null;
    });

    let isFirstChunk = true;
    let currentChunk: string[] = [];
    let count = 0;

    const resolveChunkSize =
      customChunkSzResolver ??
      ((_isFirstChunk: boolean, count: number) => {
        if (_isFirstChunk) return firstChunkSize ?? 500;
        if (count < 10_000) return 5_000;
        if (count < 50_000) return 20_000;
        return 50_000;
      });

    while (true) {
      while (lines.length > 0) {
        const line = lines.shift()!;
        currentChunk.push(line);
        count++;

        if (currentChunk.length === resolveChunkSize(isFirstChunk, count)) {
          yield currentChunk;
          isFirstChunk = false;
          currentChunk = [];
          if (lines.length < MAX_BUFFER_LINES / 2) rg.stdout.resume();
        }

        if (maxResults && count >= maxResults) {
          if (currentChunk.length > 0) yield currentChunk;
          rg.kill();
          await closePromise;
          return;
        }
      }

      if (done) break;

      await new Promise<void>((res) => {
        resolveNext = res;
      });
    }

    if (currentChunk.length > 0) yield currentChunk;
    await closePromise;
  }
}
