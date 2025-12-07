import * as vscode from "vscode";
import { FromWebviewKindMessage, ToWebviewKindMessage } from "../../shared/extension-webview-protocol";

export class WebviewController {
  constructor(private readonly wv: vscode.Webview) {}

  public async sendMessage(msg: ToWebviewKindMessage) {
    await this.wv.postMessage(msg);
  }

  public async onMessage(cb: (msg: FromWebviewKindMessage) => Promise<void>) {
    this.wv.onDidReceiveMessage(cb);
  }
}
