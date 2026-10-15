import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { isChunkableProvider } from "../../abstractions/chunkable-provider";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { ChunkStreamer } from "../../chunk-streamer";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { DynamicSearchState } from "../dynamic-search-state";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";
import { WebviewController } from "../webview.controller";

const SEARCH_DEBOUNCE_MS = 50;

function waitForDebounce(signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    const timeout = setTimeout(() => resolve(true), SEARCH_DEBOUNCE_MS);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve(false);
      },
      { once: true },
    );
  });
}

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
    DynamicSearchState.cancel();
    if (!provider.supportsDynamicSearch || !provider.searchOnDynamicMode || !msg.query) return;

    const requestId = msg.requestId;
    const abortController = DynamicSearchState.start(requestId);
    if (!(await waitForDebounce(abortController.signal))) return;

    try {
      if (isChunkableProvider(provider) && typeof (provider as any).searchOnDynamicModeStream === "function") {
        const gen = await (provider as any).searchOnDynamicModeStream(msg.query, undefined, abortController.signal);
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
          await streamer.streamFromGenerator(gen);
          return;
        }
      }

      const searchResult = await provider.searchOnDynamicMode(msg.query);

      if (!DynamicSearchState.isActive(requestId, abortController)) return;

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
        await streamer.streamConcurrently(provider.concurrency);
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
    } finally {
      DynamicSearchState.finish(requestId, abortController);
    }
  }
}
