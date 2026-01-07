import path from "path";
import * as vscode from "vscode";

export function joinPath(baseUri: vscode.Uri, ...paths: string[]): vscode.Uri {
  return vscode.Uri.joinPath(baseUri, ...paths);
}

export function resolvePathExt(_path: string) {
  let ext = path.extname(_path).slice(1).toLowerCase();

  if (path.basename(_path) === "Dockerfile") {
    ext = "docker";
  }

  return ext !== "" ? ext : "txt";
}

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "typescript",
  jsx: "typescript",
  py: "typescript",
  go: "typescript",
  rs: "typescript",
  java: "typescript",
  md: "typescript",
  json: "typescript",
  yml: "typescript",
  yaml: "typescript",
  toml: "typescript",
  css: "typescript",
  scss: "typescript",
  html: "typescript",
};

export function guessLanguageIdFromPath(path: string): string {
  const ext = resolvePathExt(path);
  return EXT_TO_LANGUAGE[ext] ?? "typescript";
}
