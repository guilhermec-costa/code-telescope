import * as vscode from "vscode";
import { Globals } from "../globals";

export async function loadWebviewHtml(...relativePaths: string[]): Promise<string> {
  const diskPath = joinPath(Globals.EXTENSION_URI, ...relativePaths);
  let rawHtml = await vscode.workspace.fs.readFile(diskPath);
  return rawHtml.toString();
}

export function replaceLocalResourcePathInHtml(
  wv: vscode.Webview,
  html: string,
  searchValue: RegExp,
  relativePath: string,
) {
  const resourcePath = joinPath(Globals.EXTENSION_URI, relativePath);
  const rootReplacerPath = wv.asWebviewUri(resourcePath).toString();
  return html.replace(searchValue, rootReplacerPath);
}

export function joinPath(baseUri: vscode.Uri, ...paths: string[]): vscode.Uri {
  return vscode.Uri.joinPath(baseUri, ...paths);
}
