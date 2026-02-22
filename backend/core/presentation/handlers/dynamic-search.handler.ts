import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { isChunkableProvider } from "../../abstractions/chunkable-provider";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { ChunkStreamer } from "../../chunk-streamer";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";
import { WebviewController } from "../webview.controller";

/**
 * Handles dynamic search requests coming from the webview.
 *
 * Dispatches the query to the active fuzzy finder provider
 * and returns updated option lists in real time.
 */
@WebviewMessageHandler()
export class DynamicSearchHandler implements IWebviewMessageHandler<"dynamicSearch"> {
  readonly type = "dynamicSearch";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "dynamicSearch" }>, wv: vscode.Webview) {
    const provider = FuzzyFinderPanelController.instance!.provider;

    if (!provider.supportsDynamicSearch || !provider.searchOnDynamicMode) return;

    const searchResult = await provider.searchOnDynamicMode(msg.query);
    const resultsArray = searchResult.results ?? [];
    const totalLimit = resultsArray.length;

    if (isChunkableProvider(provider)) {
      const streamer = new ChunkStreamer(resultsArray, {
        messageType: "optionList",
        fuzzyProviderType: provider.fuzzyAdapterType,
        dataAdapterType: provider.dataAdapterType,
        chunkSize: provider.chunkSize,
        totalLimit,
        mapChunk: async (chunk) => ({
          ...(await provider.mapChunk(chunk)),
          query: msg.query,
        }),
      });

      streamer.streamConcurrently(provider.concurrency).catch(console.error);
      return;
    }

    await WebviewController.sendMessage(wv, {
      type: "optionList",
      data: searchResult,
      fuzzyProviderType: provider.fuzzyAdapterType,
      dataAdapterType: provider.dataAdapterType,
      query: msg.query,
      totalLimit,
    });
  }
}
