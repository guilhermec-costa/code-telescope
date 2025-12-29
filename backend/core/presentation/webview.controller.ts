import * as vscode from "vscode";
import { FromWebviewKindMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { WebviewAssetManager } from "../common/webview-asset.manager";

export class WebviewController {
  /**
   * Sends a message to the webview.
   */
  static async sendMessage(wv: vscode.Webview, msg: ToWebviewKindMessage) {
    await wv.postMessage(msg);
  }

  /**
   * Registers a message handler for messages coming from the webview.
   */
  static async receiveMessage(wv: vscode.Webview, cb: (msg: FromWebviewKindMessage) => Promise<void>) {
    wv.onDidReceiveMessage(cb);
  }

  /**
   * Resolves and processes the HTML for a provider-specific webview.
   */
  static async resolveProviderWebviewHtml(wv: vscode.Webview, provider: IFuzzyFinderProvider): Promise<string> {
    return WebviewAssetManager.getProcessedHtml(wv, provider);
  }
}
