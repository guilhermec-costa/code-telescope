import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { isChunkableProvider } from "../../abstractions/chunkable-provider";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { ChunkStreamer } from "../../chunk-streamer";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";
import { PreviewRequestState } from "../preview-request-state";
import { WebviewController } from "../webview.controller";

@WebviewMessageHandler()
export class WebviewDOMReadyHandler implements IWebviewMessageHandler<"webviewDOMReady"> {
  readonly type = "webviewDOMReady";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "webviewDOMReady" }>, wv: vscode.Webview) {
    PreviewRequestState.resetPreviewRequestId();

    const provider = FuzzyFinderPanelController.instance!.provider;
    const allItems = await provider.querySelectableOptions();
    const totalLimit = Array.isArray(allItems) ? allItems.length : 0;

    if (isChunkableProvider(provider)) {
      const streamer = new ChunkStreamer(allItems, {
        messageType: "optionList",
        fuzzyProviderType: provider.fuzzyAdapterType,
        dataAdapterType: provider.dataAdapterType,
        chunkSize: provider.chunkSize,
        mapChunk: provider.mapChunk.bind(provider),
        totalLimit,
      });

      streamer.streamConcurrently(provider.concurrency).then(() => {});
      return;
    }

    await WebviewController.sendMessage(wv, {
      type: "optionList",
      data: allItems,
      fuzzyProviderType: provider.fuzzyAdapterType,
      dataAdapterType: provider.dataAdapterType,
      totalLimit,
    });
  }
}
