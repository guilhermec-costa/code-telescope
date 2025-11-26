import * as vscode from "vscode";
import { Globals } from "../globals";

export async function loadWebviewHtml(relativePath: string): Promise<string> {
  const diskPath = joinPath(Globals.extensionUri, relativePath);
  let rawHtml = await vscode.workspace.fs.readFile(diskPath);
  return rawHtml.toString();
}

export function replaceRootDirStrInHtml(wv: vscode.Webview, html: string, relativePath: string) {
  const resourcePath = joinPath(Globals.extensionUri, relativePath);
  const rootSubstPath = wv.asWebviewUri(resourcePath).toString();
  return html.replace(/{{root}}/g, rootSubstPath);
}

export function joinPath(baseUri: vscode.Uri, ...paths: string[]): vscode.Uri {
  return vscode.Uri.joinPath(baseUri, ...paths);
}
