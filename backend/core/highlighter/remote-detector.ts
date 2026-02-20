import * as fs from "fs";
import os from "os";

export type ExtensionHostType = "wsl" | "devcontainer" | "local";

export class HostDetector {
  private static hostType: ExtensionHostType | null = null;

  static detect(): ExtensionHostType {
    if (this.hostType !== null) return this.hostType;
    if (this.isWsl()) return (this.hostType = "wsl");
    if (this.isDevContainer()) return (this.hostType = "devcontainer");
    return (this.hostType = "local");
  }

  private static isDevContainer() {
    if (
      process.env.REMOTE_CONTAINERS ||
      process.env.CODESPACES ||
      process.env.VSCODE_REMOTE_CONTAINERS_SESSION ||
      fs.existsSync("/.dockerenv")
    ) {
      return true;
    }
    return false;
  }

  private static isWsl() {
    try {
      if (process.env.WSL_DISTRO_NAME) {
        return true;
      }

      const version = fs.readFileSync("/proc/version", "utf8").toLowerCase();
      if (version.includes("microsoft") || version.includes("wsl")) {
        return true;
      }

      if (os.release().toLowerCase().includes("microsoft")) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }
}
