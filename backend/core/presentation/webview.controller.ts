import * as vscode from "vscode";
import { FromWebviewKindMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { joinPath } from "../../utils/files";
import { HtmlLoadConfig } from "../abstractions/fuzzy-finder.provider";

export class WebviewController {
  static async sendMessage(wv: vscode.Webview, msg: ToWebviewKindMessage) {
    await wv.postMessage(msg);
  }

  static async onMessage(wv: vscode.Webview, cb: (msg: FromWebviewKindMessage) => Promise<void>) {
    wv.onDidReceiveMessage(cb);
  }

  static async resolveWebviewHtml(wv: vscode.Webview, cfg: HtmlLoadConfig): Promise<string> {
    const diskPath = joinPath(Globals.EXTENSION_URI, "ui", "views", cfg.fileName);
    let fileContent = await vscode.workspace.fs.readFile(diskPath);
    let html = fileContent.toString();

    for (const [key, distPath] of Object.entries(cfg.placeholders)) {
      const uri = wv.asWebviewUri(vscode.Uri.joinPath(Globals.EXTENSION_URI, distPath));
      html = html.replace(key, uri.toString());
    }

    const shikiBasePath = wv.asWebviewUri(joinPath(Globals.EXTENSION_URI, "ui", "dist", "shiki"));

    html = html.replace("{{__SHIKI_EXTENSION_URI__}}", shikiBasePath.toString());

    return html;
  }
}
