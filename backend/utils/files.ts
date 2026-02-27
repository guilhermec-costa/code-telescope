import path from "path";
import * as vscode from "vscode";
import { PreviewRendererType } from "../../shared/adapters-namespace";
import extToIcon from "../config/ext-to-icon-name.json";
import extTolangId from "../config/ext-to-langid.json";
import { FuzzyFinderPanelController } from "../core/presentation/fuzzy-panel.controller";
import { Globals } from "../globals";

export function joinPath(baseUri: vscode.Uri, ...paths: string[]): vscode.Uri {
  return vscode.Uri.joinPath(baseUri, ...paths);
}

export function resolvePathExt(_path: string) {
  let ext = path.extname(_path).slice(1).toLowerCase();

  const basename = path.basename(_path).toLowerCase();

  // special files
  if (basename === "dockerfile" || basename.startsWith("dockerfile.")) {
    return "docker";
  }
  if (basename === "makefile") {
    return "makefile";
  }
  if (basename === ".gitignore") {
    return "txt";
  }
  if (basename === ".gitattributes") {
    return "gitattributes";
  }
  if (basename === ".gitmodules") {
    return "gitmodules";
  }
  if (basename === ".env" || basename.startsWith(".env.")) {
    return "env";
  }
  if (basename === ".editorconfig") {
    return "editorconfig";
  }
  if (basename === ".prettierrc" || basename === "prettier.config.js") {
    return "prettierrc";
  }
  if (basename === ".eslintrc" || basename.startsWith(".eslintrc.")) {
    return "eslintrc";
  }
  if (basename === "package.json") {
    return "json";
  }
  if (ext === "h") {
    return "c";
  }

  return ext !== "" ? ext : "txt";
}

export function getIconNameFromPath(path: string): string {
  const ext = resolvePathExt(path).toLowerCase();
  return (extToIcon as any)[ext] ?? "file";
}

const svgIconUrlCache = new Map<string, string>();

export function getSvgIconUrl(filePath: string) {
  const language = getIconNameFromPath(filePath);

  if (svgIconUrlCache.has(language)) {
    return svgIconUrlCache.get(language)!;
  }

  const svgPath = joinPath(Globals.EXTENSION_URI, "ui", "dist", "vendor", "material-icons", `${language}.svg`);
  const wv = FuzzyFinderPanelController.instance?.webview!;
  const url = wv.asWebviewUri(svgPath).toString();

  svgIconUrlCache.set(language, url);
  return url;
}

export function getLanguageIdForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return (extTolangId as Record<string, string>)[ext] || "plaintext";
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function getPreviewOverride(fileType: string): PreviewRendererType {
  return "preview.branch";
}
