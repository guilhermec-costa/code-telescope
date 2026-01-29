import path from "path";
import * as vscode from "vscode";
import extToLang from "../config/ext-to-langs.json";
import { FuzzyFinderPanelController } from "../core/presentation/fuzzy-panel.controller";
import { Globals } from "../globals";

export function joinPath(baseUri: vscode.Uri, ...paths: string[]): vscode.Uri {
  return vscode.Uri.joinPath(baseUri, ...paths);
}

export function resolvePathExt(_path: string) {
  let ext = path.extname(_path).slice(1).toLowerCase();

  const basename = path.basename(_path).toLowerCase();

  // Special files
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
  if (ext === "feature" || ext === "example") {
    return "txt";
  }

  return ext !== "" ? ext : "txt";
}

export function guessLanguageIdFromPath(path: string): string {
  const ext = resolvePathExt(path);
  return (extToLang as any)[ext] ?? "file";
}

export function getSvgIconUrl(path: string) {
  const language = guessLanguageIdFromPath(path);
  const svgPath = joinPath(Globals.EXTENSION_URI, "ui", "dist", "vendor", "material-icons", `${language}.svg`);
  const wv = FuzzyFinderPanelController.instance?.webview!;
  return wv.asWebviewUri(svgPath).toString();
}
