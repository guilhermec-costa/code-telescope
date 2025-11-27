import * as vscode from "vscode";

export function isHiddenFile(filePath: string): boolean {
  const pathParts: string[] = filePath.split("/");
  const lastPathPart = pathParts[pathParts.length - 1];
  if (lastPathPart.startsWith(".")) return true;
  return false;
}

export async function findWorkspaceFiles(includePattern: string, excludePattern: string, maxResults: number) {
  return await vscode.workspace.findFiles(includePattern, excludePattern, maxResults);
}
