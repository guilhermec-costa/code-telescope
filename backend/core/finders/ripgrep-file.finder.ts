import { spawn } from "child_process";
import * as fs from "fs/promises";
import path from "path";
import * as vscode from "vscode";
import { DEFAULT_EXCLUDE_PATTERNS } from "../../config/exclude-patterns";
import { ExtensionConfigManager } from "../common/config-manager";

export class RipgrepFileFinder {
  private _rgAvailable = false;
  private _rgPath = "";

  constructor() {
    this.checkRipgrepAvailability();
  }

  get ripgrepAvailable() {
    return this._rgAvailable;
  }

  private async checkRipgrepAvailability() {
    const appRoot = vscode.env.appRoot;
    const possiblePaths = [
      path.join(appRoot, "node_modules", "@vscode", "ripgrep", "bin", "rg.exe"),
      path.join(appRoot, "node_modules", "@vscode", "ripgrep", "bin", "rg"),
      path.join(appRoot, "node_modules", "vscode-ripgrep", "bin", "rg"),
    ];

    for (const rgPath of possiblePaths) {
      try {
        await fs.access(rgPath);
        this._rgPath = rgPath;
        this._rgAvailable = true;
        return;
      } catch {}
    }

    try {
      await new Promise<void>((res, rej) => {
        const rg = spawn(process.platform === "win32" ? "rg.exe" : "rg", ["--version"]);
        rg.on("close", (code) => {
          if (code === 0) {
            this._rgPath = process.platform === "win32" ? "rg.exe" : "rg";
            this._rgAvailable = true;
            res();
          } else rej();
        });
        rg.on("error", rej);
      });
    } catch {
      this._rgAvailable = false;
    }
  }

  public async *streamFiles(rootPath: string): AsyncGenerator<string[]> {
    const { excludePatterns, excludeHidden, includePatterns, maxResults } = ExtensionConfigManager.wsFileFinderCfg;

    const args: string[] = ["--files"];

    for (const pattern of includePatterns) {
      args.push("--glob", pattern);
    }

    const excludes = [...excludePatterns, ...DEFAULT_EXCLUDE_PATTERNS];
    for (const pattern of excludes) {
      args.push("--glob", `!${pattern}`);
    }

    if (!excludeHidden) args.push("--hidden");
    args.push("--no-ignore");
    args.push("--");
    args.push(rootPath);

    const rg = spawn(this._rgPath, args, {
      cwd: rootPath,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const closePromise = new Promise<void>((res) => rg.on("close", res));

    let buffer = "";
    let count = 0;
    let currentChunk: string[] = [];
    const lines: string[] = [];
    let done = false;
    let resolveNext: (() => void) | null = null;

    let isFirstChunk = true;
    const CHUNK_SIZE = 8000;
    const MAX_BUFFER_LINES = CHUNK_SIZE * 2;

    const getChunkSize = () => (isFirstChunk ? 100 : CHUNK_SIZE);

    rg.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();
      const bufLines = buffer.split("\n");
      buffer = bufLines.pop() ?? "";
      for (const line of bufLines) {
        const trimed = line.trim();
        if (trimed) lines.push(trimed);
      }

      // backpressure mechanism
      if (lines.length >= MAX_BUFFER_LINES) {
        rg.stdout.pause();
      }

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

    while (true) {
      while (lines.length > 0) {
        const line = lines.shift()!;
        const filePath = path.isAbsolute(line) ? line : path.join(rootPath, line);
        currentChunk.push(filePath);
        count++;

        if (currentChunk.length === getChunkSize()) {
          yield currentChunk;
          isFirstChunk = false;
          currentChunk = [];

          if (lines.length < MAX_BUFFER_LINES / 2) {
            rg.stdout.resume();
          }
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
