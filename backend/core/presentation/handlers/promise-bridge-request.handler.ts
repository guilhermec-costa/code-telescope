import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { GrammarChunkStreamer } from "../../highlighter/grammar-chunk-streamer";
import { HighlighterAssetLoader } from "../../highlighter/highlighter-asset-loader";
import { WebviewController } from "../webview.controller";

@WebviewMessageHandler()
export class PromiseBridgeRequestHandler implements IWebviewMessageHandler<"promiseBridgeRequest"> {
  readonly type = "promiseBridgeRequest";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "promiseBridgeRequest" }>, wv: vscode.Webview) {
    let payload: any | null;
    let jsonContent: string;

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

    if (!payload) {
      await WebviewController.sendMessage(wv, {
        type: "promiseBridgeResponse",
        data: {
          requestId: msg.requestId,
          payload: null,
          error: "Grammar not found",
        },
      });
      return;
    }

    jsonContent = JSON.stringify(payload);

    if (GrammarChunkStreamer.shouldUseChunking(jsonContent)) {
      const streamer = new GrammarChunkStreamer(jsonContent, wv, {
        requestId: msg.requestId,
      });

      console.log(
        `[PromiseBridge] Grammar ${msg.kind} (${jsonContent.length} bytes) - sending in ${streamer.getTotalChunks()} chunks`,
      );

      await streamer.streamConcurrently();
    } else {
      await WebviewController.sendMessage(wv, {
        type: "promiseBridgeResponse",
        data: {
          requestId: msg.requestId,
          payload,
        },
      });
    }
  }
}
