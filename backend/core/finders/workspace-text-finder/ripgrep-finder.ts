import { spawn } from "child_process";
import * as fs from "fs/promises";
import path from "path";
import * as vscode from "vscode";
import { TextSearchMatch } from "../../../../shared/exchange/workspace-text-search";
import ripgrepArgs from "../../../config/ripgrep-args.json";

export class RipgrepFinder {
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
      path.join(appRoot, "node_modules", "@vscode", "ripgrep", "bin", "rg.exe"), // windows
      path.join(appRoot, "node_modules", "@vscode", "ripgrep", "bin", "rg"), // unix
      path.join(appRoot, "node_modules", "vscode-ripgrep", "bin", "rg"), // older
    ];

    for (const rgPath of possiblePaths) {
      try {
        await fs.access(rgPath);
        this._rgPath = rgPath;
        this._rgAvailable = true;
        console.log("ripgrep found at:", rgPath);
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
            console.log("ripgrep found in PATH");
            res();
          } else {
            rej();
          }
        });
        rg.on("error", rej);
      });
    } catch {
      console.warn("ripgrep not found, using fallback search method");
      this._rgAvailable = false;
    }
  }

  public async search(query: string): Promise<any> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return { results: [], query, message: "No workspace open" };
    }

    const matches: TextSearchMatch[] = [];
    const MAX_RESULTS = 1200;
    const cwd = workspaceFolders[0].uri.fsPath;

    console.log("Starting ripgrep search:", { query, cwd, rgPath: this._rgPath });
    const args = [query, ...ripgrepArgs];

    await new Promise<void>((resolve, reject) => {
      console.log("Spawning ripgrep with args:", args);

      let rg;
      try {
        rg = spawn(this._rgPath, args, {
          cwd,
          shell: false,
          stdio: ["ignore", "pipe", "pipe"], // ignore stdin, pipe stdout/stderr
        });
        console.log("ripgrep spawned, PID:", rg.pid);
      } catch (err) {
        console.error("Failed to spawn ripgrep:", err);
        reject(err);
        return;
      }

      let stdout = "";
      let stderr = "";
      let hasData = false;

      const timeout = setTimeout(() => {
        console.log("ripgrep timeout reached");
        rg.kill();
        reject(new Error("ripgrep timeout"));
      }, 10000);

      rg.stdout.on("data", (data) => {
        hasData = true;
        stdout += data.toString();
        console.log("ripgrep stdout chunk:", data.toString().substring(0, 100));
      });

      rg.stderr.on("data", (data) => {
        stderr += data.toString();
        console.log("ripgrep stderr:", data.toString());
      });

      rg.on("close", (code) => {
        clearTimeout(timeout);
        console.log("ripgrep closed with code:", code, "hasData:", hasData);
        console.log("stdout length:", stdout.length, "stderr length:", stderr.length);

        if (code === 0 /** find */ || code === 1 /** not find */) {
          const lines = stdout.trim().split("\n");
          console.log("Processing", lines.length, "lines");

          for (const line of lines) {
            if (matches.length >= MAX_RESULTS) break;
            if (!line.trim()) continue;

            try {
              const result = JSON.parse(line);

              if (result.type === "match") {
                const data = result.data;
                const lineText = data.lines.text.trim();

                matches.push({
                  file: path.join(cwd, data.path.text),
                  line: data.line_number,
                  column: data.submatches[0]?.start || 1,
                  text: lineText,
                  preview: lineText,
                });
              }
            } catch (e) {
              console.log("Failed to parse line:", line.substring(0, 50));
            }
          }

          console.log("Found", matches.length, "matches");
          resolve();
        } else {
          reject(new Error(`ripgrep exited with code ${code}: ${stderr}`));
        }
      });

      rg.on("exit", (code, signal) => {
        console.log("ripgrep exit event:", { code, signal });
      });

      rg.on("error", (err) => {
        clearTimeout(timeout);
        console.error("ripgrep error event:", err);
        reject(err);
      });

      console.log("Streams state:", {
        stdoutReadable: rg.stdout?.readable,
        stderrReadable: rg.stderr?.readable,
      });
    });

    return {
      results: matches,
      query: query,
      message: matches.length === 0 ? "No results found" : undefined,
    };
  }
}
