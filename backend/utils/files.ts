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
