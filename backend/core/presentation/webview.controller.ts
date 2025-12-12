import * as vscode from "vscode";
import { FromWebviewKindMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { joinPath } from "../../utils/files";
import { HtmlLoadConfig } from "../finders/fuzzy-finder.provider";

export class WebviewController {
  constructor(private readonly wv: vscode.Webview) {}

  public async sendMessage(msg: ToWebviewKindMessage) {
    await this.wv.postMessage(msg);
  }

  public async onMessage(cb: (msg: FromWebviewKindMessage) => Promise<void>) {
    this.wv.onDidReceiveMessage(cb);
  }

  public async resolveWebviewHtml(cfg: HtmlLoadConfig): Promise<string> {
    const diskPath = joinPath(Globals.EXTENSION_URI, "ui", "views", cfg.fileName);
    let fileContent = await vscode.workspace.fs.readFile(diskPath);
    let html = fileContent.toString();

    for (const [key, distPath] of Object.entries(cfg.placeholders)) {
      const uri = this.wv.asWebviewUri(vscode.Uri.joinPath(Globals.EXTENSION_URI, distPath));
      html = html.replace(key, uri.toString());
    }

    const shikiBasePath = this.wv.asWebviewUri(joinPath(Globals.EXTENSION_URI, "ui", "dist", "shiki"));

    html = html.replace("{{__SHIKI_EXTENSION_URI__}}", shikiBasePath.toString());

    return html;
  }
}
