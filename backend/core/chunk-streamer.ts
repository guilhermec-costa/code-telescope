import { DataAdapterType, FuzzyProviderType } from "../../shared/adapters-namespace";
import { FuzzyFinderPanelController } from "./presentation/fuzzy-panel.controller";
import { WebviewController } from "./presentation/webview.controller";

export interface ChunkStreamOptions<T> {
  messageType: string;
  fuzzyProviderType: FuzzyProviderType;
  dataAdapterType: DataAdapterType;
  chunkSize?: number;
  mapChunk?: (chunk: T[]) => any;
  query?: string;
  requestId?: string;
  totalLimit: number;
}

export class ChunkStreamer<T> {
  private chunkSize: number;

  constructor(
    private initialItems: T[],
    private options: ChunkStreamOptions<T>,
    private signal?: AbortSignal,
  ) {
    this.chunkSize = options.chunkSize ?? 2000;
  }

  private checkAborted(): boolean {
    return this.signal?.aborted ?? false;
  }

  async streamFromGenerator(gen: AsyncGenerator<T[]>) {
    const { messageType, fuzzyProviderType, dataAdapterType, mapChunk, query, requestId } = this.options;
    const webview = FuzzyFinderPanelController.instance?.webview;
    if (!webview) return;

    for await (const chunk of gen) {
      if (this.checkAborted()) return;
      const mapped = mapChunk ? await mapChunk(chunk) : chunk;
      if (this.checkAborted()) return;
      await WebviewController.sendMessage(webview, {
        type: messageType as any,
        data: mapped,
        fuzzyProviderType,
        dataAdapterType,
        totalLimit: -1,
        query,
        requestId,
      });
    }
  }

  async streamAsync() {
    const { messageType, fuzzyProviderType, dataAdapterType, mapChunk, totalLimit, query, requestId } = this.options;
    for (let i = 0; i < this.initialItems.length; i += this.chunkSize) {
      if (this.checkAborted()) return;
      await new Promise((r) => setTimeout(r, 16));
      if (this.checkAborted()) return;
      const chunk = this.initialItems.slice(i, i + this.chunkSize);
      const webview = FuzzyFinderPanelController.instance?.webview;
      if (!webview) return;
      await WebviewController.sendMessage(webview, {
        type: messageType as any,
        data: mapChunk ? mapChunk(chunk) : chunk,
        fuzzyProviderType,
        dataAdapterType,
        totalLimit,
        query,
        requestId,
      });
    }
  }

  async streamConcurrently(concurrency: number = 4) {
    const { messageType, fuzzyProviderType, dataAdapterType, mapChunk, totalLimit, query, requestId } = this.options;
    const webview = FuzzyFinderPanelController.instance?.webview;
    if (!webview) return;
    const { default: pLimit } = await import("p-limit");
    const limit = pLimit(concurrency);
    const jobs = [];
    for (let i = 0; i < this.initialItems.length; i += this.chunkSize) {
      if (this.checkAborted()) return;
      const chunk = this.initialItems.slice(i, i + this.chunkSize);
      jobs.push(
        limit(async () => {
          if (this.checkAborted()) return;
          const mapped = mapChunk ? await mapChunk(chunk) : chunk;
          if (this.checkAborted()) return;
          WebviewController.sendMessage(webview, {
            type: messageType as any,
            data: mapped,
            fuzzyProviderType,
            dataAdapterType,
            totalLimit,
            query,
            requestId,
          });
        }),
      );
    }
    await Promise.all(jobs);
  }
}
