import * as vscode from "vscode";
import { FromWebviewKindMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { WebviewAssetManager } from "../common/webview-asset.manager";

export class WebviewController {
  static async sendMessage(wv: vscode.Webview, msg: ToWebviewKindMessage) {
    await wv.postMessage(msg);
  }

  static async onMessage(wv: vscode.Webview, cb: (msg: FromWebviewKindMessage) => Promise<void>) {
    wv.onDidReceiveMessage(cb);
  }

  static async resolveProviderWebviewHtml(wv: vscode.Webview, provider: IFuzzyFinderProvider): Promise<string> {
    return WebviewAssetManager.getProcessedHtml(wv, provider);
  }
}
