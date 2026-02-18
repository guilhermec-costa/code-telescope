import { PreviewRendererType } from "../../shared/adapters-namespace";
import { PreviewData } from "../../shared/extension-webview-protocol";
import { FuzzyFinderPanelController } from "./presentation/fuzzy-panel.controller";
import { WebviewController } from "./presentation/webview.controller";

const DEFAULT_CHUNK_SIZE_BYTES = 100 * 1024; // 100KB default chunk size

export interface BufferChunkOptions {
  previewAdapterType: PreviewRendererType;
  metadata: PreviewData["metadata"];
  language: string;
  theme: string;
  chunkSizeBytes?: number;
}

export class BufferChunkStreamer {
  private chunkSizeBytes: number;

  constructor(
    private content: string,
    private options: BufferChunkOptions,
  ) {
    this.chunkSizeBytes = options.chunkSizeBytes ?? DEFAULT_CHUNK_SIZE_BYTES;
  }

  async streamConcurrently(concurrency: number = 4) {
    const { previewAdapterType, metadata } = this.options;
    const webview = FuzzyFinderPanelController.instance?.webview;
    if (!webview) return;

    const chunks = this.splitIntoChunks();
    const totalChunks = chunks.length;

    const { default: pLimit } = await import("p-limit");
    const limit = pLimit(concurrency);

    const jobs = chunks.map((chunk, index) =>
      limit(() =>
        WebviewController.sendMessage(webview, {
          type: "previewChunk",
          chunkIndex: index,
          totalChunks,
          content: chunk,
        }),
      ),
    );

    await Promise.all(jobs);

    const { language, theme } = this.options;
    await WebviewController.sendMessage(webview, {
      type: "previewComplete",
      previewAdapterType,
      language,
      theme,
      metadata,
    });
  }

  private splitIntoChunks(): string[] {
    const chunks: string[] = [];
    const totalLength = this.content.length;

    for (let i = 0; i < totalLength; i += this.chunkSizeBytes) {
      chunks.push(this.content.substring(i, i + this.chunkSizeBytes));
    }

    return chunks;
  }
}
