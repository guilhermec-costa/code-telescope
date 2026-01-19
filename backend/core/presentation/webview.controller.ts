import * as vscode from "vscode";
import { FromWebviewKindMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { WebviewAssetManager } from "../common/webview-asset.manager";
import { Logger } from "../log";

export class WebviewController {
  /**
   * Sends a message to the webview.
   */
  static async sendMessage(wv: vscode.Webview, msg: ToWebviewKindMessage) {
    const t0 = performance.now();

    let size = 0;
    try {
      size = Buffer.byteLength(JSON.stringify(msg), "utf8");
    } catch {
      // ignore serialization errors
    }

    Logger.info(`[Webview → postMessage] type=${msg.type} size=${(size / 1024).toFixed(1)}kb`);

    await wv.postMessage(msg);

    const t1 = performance.now();
    Logger.info(`[Webview → postMessage] queued in ${(t1 - t0).toFixed(2)}ms`);
  }

  /**
   * Registers a message handler for messages coming from the webview.
   */
  static async receiveMessage(wv: vscode.Webview, cb: (msg: FromWebviewKindMessage) => Promise<void>) {
    wv.onDidReceiveMessage(async (msg) => {
      const t0 = performance.now();

      Logger.info(`[Webview ← message] type=${msg.type}`);

      await cb(msg);

      const t1 = performance.now();
      Logger.info(`[Webview ← message] handled in ${(t1 - t0).toFixed(2)}ms`);
    });
  }

  /**
   * Resolves and processes the HTML for a provider-specific webview.
   */
  static async resolveProviderWebviewHtml(wv: vscode.Webview, provider: IFuzzyFinderProvider): Promise<string> {
    const t0 = performance.now();

    Logger.info(`[Webview HTML] resolving for provider=${provider.fuzzyAdapterType}`);

    const html = await WebviewAssetManager.getProcessedHtml(wv, provider);

    const t1 = performance.now();
    Logger.info(`[Webview HTML] resolved in ${(t1 - t0).toFixed(2)}ms`);

    return html;
  }
}
