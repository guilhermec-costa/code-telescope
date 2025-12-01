import * as vscode from "vscode";
import { Globals } from "../globals";

export async function findWorkspaceFiles(includePattern: string, excludePattern: string, maxResults: number) {
  return await vscode.workspace.findFiles(includePattern, excludePattern, maxResults);
}

export function relativizeFilePath(path: string) {
  return vscode.workspace.asRelativePath(path);
}

export function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return (
    {
      js: "javascript",
      ts: "typescript",
      jsx: "javascript",
      tsx: "typescript",
      py: "python",
      json: "json",
      md: "markdown",
    }[ext] || "text"
  );
}

export function joinPath(baseUri: vscode.Uri, ...paths: string[]): vscode.Uri {
  return vscode.Uri.joinPath(baseUri, ...paths);
}

export async function loadWebviewHtml(...relativePaths: string[]): Promise<string> {
  const diskPath = joinPath(Globals.EXTENSION_URI, ...relativePaths);
  let rawHtml = await vscode.workspace.fs.readFile(diskPath);
  return rawHtml.toString();
}
