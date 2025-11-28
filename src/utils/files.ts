import * as vscode from "vscode";

export async function findWorkspaceFiles(includePattern: string, excludePattern: string, maxResults: number) {
  return await vscode.workspace.findFiles(includePattern, excludePattern, maxResults);
}

export function relativizeFilePath(path: string) {
  return vscode.workspace.asRelativePath(path);
}
