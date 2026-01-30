import { FuzzyProviderType } from "../../shared/adapters-namespace";
import { FuzzyFinderPanelController } from "./presentation/fuzzy-panel.controller";
import { WebviewController } from "./presentation/webview.controller";

export interface ChunkStreamOptions<T> {
  messageType: string;
  fuzzyProviderType: FuzzyProviderType;
  chunkSize?: number;
  mapChunk?: (chunk: T[]) => any;
}

export class ChunkStreamer<T> {
  private chunkSize: number;

  constructor(
    private items: T[],
    private options: ChunkStreamOptions<T>,
  ) {
    this.chunkSize = options.chunkSize ?? 2000;
  }

  async stream() {
    const { messageType, fuzzyProviderType, mapChunk } = this.options;
    const webview = FuzzyFinderPanelController.instance?.webview;
    if (!webview) return;

    const { default: pLimit } = await import("p-limit");
    const limit = pLimit(4);

    const jobs = [];

    for (let i = 0; i < this.items.length; i += this.chunkSize) {
      const chunk = this.items.slice(i, i + this.chunkSize);
      const isLastChunk = i + this.chunkSize >= this.items.length;

      jobs.push(
        limit(() =>
          WebviewController.sendMessage(webview, {
            type: messageType as any,
            data: mapChunk ? mapChunk(chunk) : chunk,
            isChunk: true,
            isLastChunk,
            fuzzyProviderType,
          }),
        ),
      );
    }

    await Promise.all(jobs);
  }
}
