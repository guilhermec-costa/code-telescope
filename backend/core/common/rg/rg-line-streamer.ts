import { spawn } from "child_process";

export interface RipgrepLineStreamerOptions {
  rgPath: string;
  args: string[];
  cwd: string;
  firstChunkSize?: number;
  chunkSize?: number;
  maxResults?: number;
  signal?: AbortSignal; // to prevent spawning multiple rg processes in dynamic search
}

export class RipgrepLineStreamer {
  static async *stream(opts: RipgrepLineStreamerOptions): AsyncGenerator<string[]> {
    const { signal, rgPath, args, cwd, firstChunkSize = 100, chunkSize = 8000, maxResults } = opts;

    const rg = spawn(rgPath, args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    signal?.addEventListener("abort", () => {
      rg.kill();
    });

    const closePromise = new Promise<void>((res) => rg.on("close", res));

    const MAX_BUFFER_LINES = chunkSize * 2;
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

    const getChunkSize = () => (isFirstChunk ? firstChunkSize : chunkSize);

    while (true) {
      while (lines.length > 0) {
        const line = lines.shift()!;
        currentChunk.push(line);
        count++;

        if (currentChunk.length === getChunkSize()) {
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
