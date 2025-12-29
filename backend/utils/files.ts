import * as vscode from "vscode";

export function joinPath(baseUri: vscode.Uri, ...paths: string[]): vscode.Uri {
  return vscode.Uri.joinPath(baseUri, ...paths);
}
