import * as vscode from "vscode";

export async function loadWebviewHtml(extensionUri: vscode.Uri, relativePath: string): Promise<string> {
  const diskPath = vscode.Uri.joinPath(extensionUri, relativePath);
  let rawHtml = await vscode.workspace.fs.readFile(diskPath);
  return rawHtml.toString();
}

export function replaceRootDirStr(wv: vscode.Webview, extensionUri: vscode.Uri, relativePath: string, html: string) {
  const rootSubstPath = wv.asWebviewUri(vscode.Uri.joinPath(extensionUri, relativePath)).toString();
  html = html.replace(/{{root}}/g, rootSubstPath);
  return html;
}
