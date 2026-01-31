import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { HighlighterAssetLoader } from "../../highlighter-asset-loader";
import { WebviewController } from "../webview.controller";

@WebviewMessageHandler()
export class PromiseBridgeRequestHandler implements IWebviewMessageHandler<"promiseBridgeRequest"> {
  readonly type = "promiseBridgeRequest";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "promiseBridgeRequest" }>, wv: vscode.Webview) {
    let payload: any | null;
    switch (msg.kind) {
      case "langGrammar": {
        const langId = msg.data;
        payload = await HighlighterAssetLoader.getLanguageGrammar(langId);
        break;
      }

      case "themeGrammar": {
        const themeId = msg.data;
        payload = await HighlighterAssetLoader.getThemeGrammar(themeId);
        break;
      }
    }

    await WebviewController.sendMessage(wv, {
      type: "promiseBridgeResponse",
      data: {
        requestId: msg.requestId,
        payload,
      },
    });
  }
}
