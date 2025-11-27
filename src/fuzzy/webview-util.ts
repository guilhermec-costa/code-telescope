import * as vscode from "vscode";

export class WebviewManager {
  constructor(private readonly wv: vscode.Webview) {}

  public async sendMessage(msg: WebviewMessage) {
    await this.wv.postMessage(msg);
  }
}
