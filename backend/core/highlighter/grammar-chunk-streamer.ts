import * as vscode from "vscode";
import { GrammarChunkMessage, GrammarCompleteMessage } from "../../../shared/extension-webview-protocol";
import { WebviewController } from "../presentation/webview.controller";

export interface GrammarChunkOptions {
  requestId: string;
  chunkSizeBytes?: number;
}

export class GrammarChunkStreamer {
  private chunkSizeBytes: number;
  public readonly DEFAULT_CHUNK_SIZE_BYTES = 50 * 1024;
  public static readonly GRAMMAR_CHUNK_THRESHOLD_BYTES = 50 * 1024;
  public readonly CHUNK_CONCURRENCY = 4;

  constructor(
    private content: string,
    private webview: vscode.Webview,
    private options: GrammarChunkOptions,
  ) {
    this.chunkSizeBytes = options.chunkSizeBytes ?? this.DEFAULT_CHUNK_SIZE_BYTES;
  }

  static shouldUseChunking(content: string): boolean {
    return content.length > this.GRAMMAR_CHUNK_THRESHOLD_BYTES;
  }

  getTotalChunks() {
    return Math.ceil(this.content.length / GrammarChunkStreamer.GRAMMAR_CHUNK_THRESHOLD_BYTES);
  }

  async streamConcurrently() {
    const chunks = this.splitIntoChunks();
    const totalChunks = chunks.length;

    const { default: pLimit } = await import("p-limit");
    const limit = pLimit(this.CHUNK_CONCURRENCY);

    const jobs = chunks.map((chunk, index) =>
      limit(() =>
        WebviewController.sendMessage(this.webview, {
          type: "grammarChunk",
          chunkIndex: index,
          totalChunks,
          content: chunk,
          requestId: this.options.requestId,
        } as GrammarChunkMessage),
      ),
    );

    await Promise.all(jobs);

    await WebviewController.sendMessage(this.webview, {
      type: "grammarComplete",
      requestId: this.options.requestId,
    } as GrammarCompleteMessage);
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
