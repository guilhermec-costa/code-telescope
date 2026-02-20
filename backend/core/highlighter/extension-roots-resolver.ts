import { execSync } from "child_process";
import * as fs from "fs";
import os from "os";
import * as path from "path";

export class ExtensionRootsResolver {
  private static wslRoots: string[] | null = null;
  private static devcontainerRoots: string[] | null = null;

  static getWslRoots(): string[] {
    if (this.wslRoots !== null) return this.wslRoots;

    const roots: string[] = [];
    const winUser = this.getWindowsUsername();

    if (winUser) {
      const base = `/mnt/c/Users/${winUser}`;

      for (const p of [path.join(base, ".vscode", "extensions"), path.join(base, ".vscode-insiders", "extensions")]) {
        if (fs.existsSync(p)) roots.push(p);
      }

      const builtinPath = this.getVsCodeBuiltinExtensionsPath(winUser);
      if (builtinPath) roots.push(builtinPath);
    }

    return (this.wslRoots = roots);
  }

  static getDevcontainerRoots(): string[] {
    if (this.devcontainerRoots !== null) return this.devcontainerRoots;

    const roots: string[] = [];
    const vscodeServerBase = path.join(os.homedir(), ".vscode-server");

    const serverExtensions = path.join(vscodeServerBase, "extensions");
    if (fs.existsSync(serverExtensions)) roots.push(serverExtensions);

    try {
      const binDir = path.join(vscodeServerBase, "bin");
      for (const hash of fs.readdirSync(binDir)) {
        const candidate = path.join(binDir, hash, "extensions");
        if (fs.existsSync(candidate)) roots.push(candidate);
      }
    } catch {}

    return (this.devcontainerRoots = roots);
  }

  private static getWindowsUsername(): string | null {
    try {
      const username = execSync("cmd.exe /c echo %USERNAME%", { encoding: "utf8" }).trim().replace("\r", "");
      return username || null;
    } catch {
      return null;
    }
  }

  private static getVsCodeBuiltinExtensionsPath(winUser: string): string | null {
    const vscodeInstallBase = `/mnt/c/Users/${winUser}/AppData/Local/Programs/Microsoft VS Code`;

    if (!fs.existsSync(vscodeInstallBase)) return null;

    let entries: string[];
    try {
      entries = fs.readdirSync(vscodeInstallBase);
    } catch {
      return null;
    }

    for (const entry of entries) {
      const candidate = path.join(vscodeInstallBase, entry, "resources", "app", "extensions");
      if (fs.existsSync(candidate)) return candidate;
    }

    return null;
  }
}
