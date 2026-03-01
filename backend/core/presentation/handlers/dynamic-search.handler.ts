import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { isChunkableProvider } from "../../abstractions/chunkable-provider";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { ChunkStreamer } from "../../chunk-streamer";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";
import { WebviewController } from "../webview.controller";

interface ActiveRequest {
  requestId: string;
  abortController: AbortController;
}

let activeRequest: ActiveRequest | null = null;

/**
 * Handles dynamic search requests coming from the webview.
 * Dispatches the query to the active fuzzy finder provider
 * and returns updated option lists in real time using streaming if available.
 */
@WebviewMessageHandler()
export class DynamicSearchHandler implements IWebviewMessageHandler<"dynamicSearch"> {
  readonly type = "dynamicSearch";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "dynamicSearch" }>, wv: vscode.Webview) {
    const provider = FuzzyFinderPanelController.instance!.provider;
    if (!provider.supportsDynamicSearch || !provider.searchOnDynamicMode) return;

    if (activeRequest) {
      activeRequest.abortController.abort();
      activeRequest = null;
    }

    const abortController = new AbortController();
    const requestId = msg.requestId;
    activeRequest = { requestId, abortController };

    if (isChunkableProvider(provider) && typeof (provider as any).searchOnDynamicModeStream === "function") {
      const gen = await (provider as any).searchOnDynamicModeStream(msg.query);
      if (gen && typeof gen[Symbol.asyncIterator] === "function") {
        const streamer = new ChunkStreamer<any>(
          [],
          {
            messageType: "optionList",
            fuzzyProviderType: provider.fuzzyAdapterType,
            dataAdapterType: provider.dataAdapterType,
            chunkSize: provider.chunkSize,
            mapChunk: async (chunk) => ({
              ...(await provider.mapChunk(chunk)),
              query: msg.query,
            }),
            query: msg.query,
            totalLimit: -1,
            requestId,
          },
          abortController.signal,
        );
        streamer.streamFromGenerator(gen).catch(console.error);
        return;
      }
    }

    const searchResult = await provider.searchOnDynamicMode(msg.query);

    if (activeRequest?.abortController !== abortController) return;

    const resultsArray = searchResult.results ?? [];
    const totalLimit = resultsArray.length;

    if (isChunkableProvider(provider)) {
      const streamer = new ChunkStreamer(
        resultsArray,
        {
          messageType: "optionList",
          fuzzyProviderType: provider.fuzzyAdapterType,
          dataAdapterType: provider.dataAdapterType,
          chunkSize: provider.chunkSize,
          totalLimit,
          mapChunk: async (chunk) => ({
            ...(await provider.mapChunk(chunk)),
            query: msg.query,
          }),
          query: msg.query,
          requestId,
        },
        abortController.signal,
      );
      streamer.streamConcurrently(provider.concurrency).catch(console.error);
      return;
    }

    await WebviewController.sendMessage(wv, {
      type: "optionList",
      data: searchResult,
      fuzzyProviderType: provider.fuzzyAdapterType,
      dataAdapterType: provider.dataAdapterType,
      query: msg.query,
      requestId,
      totalLimit,
    });
  }
}
