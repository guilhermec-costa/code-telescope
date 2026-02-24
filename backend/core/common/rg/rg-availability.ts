import { spawn } from "child_process";
import * as fs from "fs/promises";
import path from "path";
import * as vscode from "vscode";

export class RipgrepAvailability {
  private static _rgPath = "";
  private static _available = false;
  private static _checked = false;
  private static _checkPromise: Promise<void> | null = null;

  static async ensure(): Promise<void> {
    if (this._checked) return;
    if (this._checkPromise) return this._checkPromise;
    this._checkPromise = this._check();
    return this._checkPromise;
  }

  static get available(): boolean {
    return this._available;
  }

  static get rgPath(): string {
    return this._rgPath;
  }

  private static async _check(): Promise<void> {
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
        this._available = true;
        this._checked = true;
        return;
      } catch {}
    }

    try {
      await new Promise<void>((res, rej) => {
        const rg = spawn(process.platform === "win32" ? "rg.exe" : "rg", ["--version"]);
        rg.on("close", (code) => {
          if (code === 0) {
            this._rgPath = process.platform === "win32" ? "rg.exe" : "rg";
            this._available = true;
            res();
          } else rej();
        });
        rg.on("error", rej);
      });
    } catch {
      this._available = false;
    }

    this._checked = true;
  }
}
