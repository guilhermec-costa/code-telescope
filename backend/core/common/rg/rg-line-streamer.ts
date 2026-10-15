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

    signal?.addEventListener("abort", () => rg.kill(), { once: true });

    let spawnError: Error | undefined;
    let stderr = "";
    let stoppedAtLimit = false;
    const closePromise = new Promise<{ code: number | null; processSignal: NodeJS.Signals | null }>((resolve) =>
      rg.on("close", (code, processSignal) => resolve({ code, processSignal })),
    );

    const MAX_BUFFER_LINES = backpressureBufSize * 2;
    const lines: string[] = [];
    let readIndex = 0;
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
      if (lines.length - readIndex >= MAX_BUFFER_LINES) rg.stdout.pause();
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
      spawnError = err;
      done = true;
      resolveNext?.();
      resolveNext = null;
    });

    rg.stderr.on("data", (data: Buffer) => {
      stderr = (stderr + data.toString("utf-8")).slice(-16_384);
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
      while (readIndex < lines.length) {
        const line = lines[readIndex++];
        currentChunk.push(line);
        count++;

        if (currentChunk.length === resolveChunkSize(isFirstChunk, count)) {
          yield currentChunk;
          isFirstChunk = false;
          currentChunk = [];
          if (lines.length - readIndex < MAX_BUFFER_LINES / 2) rg.stdout.resume();
        }

        if (maxResults && count >= maxResults) {
          if (currentChunk.length > 0) yield currentChunk;
          stoppedAtLimit = true;
          rg.kill();
          await closePromise;
          return;
        }
      }

      if (readIndex > 0) {
        lines.splice(0, readIndex);
        readIndex = 0;
      }

      if (done) break;

      await new Promise<void>((res) => {
        resolveNext = res;
      });
    }

    if (currentChunk.length > 0) yield currentChunk;
    const { code, processSignal } = await closePromise;
    if (spawnError) throw spawnError;
    if (!signal?.aborted && !stoppedAtLimit && code !== 0 && code !== 1) {
      throw new Error(
        stderr.trim() || `ripgrep exited with code ${code ?? "unknown"} (${processSignal ?? "no signal"})`,
      );
    }
  }
}
