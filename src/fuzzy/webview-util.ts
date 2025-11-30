import { WebviewMessage } from "@shared/extension-webview-protocol";
import * as vscode from "vscode";

export class WebviewManager {
  constructor(private readonly wv: vscode.Webview) {}

  public async sendMessage(msg: WebviewMessage) {
    await this.wv.postMessage(msg);
  }

  public async onMessage(cb: (msg: WebviewMessage) => Promise<void>) {
    this.wv.onDidReceiveMessage(cb);
  }
}
