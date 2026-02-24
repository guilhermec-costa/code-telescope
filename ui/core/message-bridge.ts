import {
  GrammarChunkMessage,
  GrammarCompleteMessage,
  PromiseBridgeResponse,
} from "../../shared/extension-webview-protocol";
import { WebviewToExtensionMessenger } from "./common/wv-to-extension-messenger";

type PendingRequest = {
  resolve: (data: any) => void;
  reject: (error: any) => void;
};

type PendingChunk = PendingRequest & {
  chunks: string[];
  totalChunks: number;
  timeoutId: ReturnType<typeof setTimeout>;
};

const DEFAULT_TIMEOUT = 500;

export class MessageBridge {
  private static pendingRequests = new Map<string, PendingRequest>();
  private static pendingChunks = new Map<string, PendingChunk>();

  static request<T>(type: string, data?: any, timeout: number = DEFAULT_TIMEOUT): Promise<T> {
    const requestId = Math.random().toString(36).substring(2, 9);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      WebviewToExtensionMessenger.instance.postMessage({
        type: "promiseBridgeRequest",
        requestId,
        data,
        kind: type as any,
      });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Timeout requesting asset: ${type}`));
        }
      }, timeout);
    });
  }

  static handleResponse(msg: PromiseBridgeResponse) {
    const { requestId, payload, error } = msg.data;
    const pending = this.pendingRequests.get(requestId);

    if (pending) {
      if (error) pending.reject(error);
      else pending.resolve(payload);

      this.pendingRequests.delete(requestId);
    }
  }

  static handleGrammarChunk(msg: GrammarChunkMessage) {
    const { requestId, chunkIndex, totalChunks, content } = msg;

    let pending = this.pendingChunks.get(requestId);
    if (!pending) {
      const timeout = 1000 + totalChunks * 200;

      pending = {
        chunks: [],
        totalChunks,
        resolve: () => {},
        reject: () => {},
        timeoutId: setTimeout(() => {
          this.pendingChunks.delete(requestId);
        }, timeout),
      };

      // the request which requested grammar load
      const originalRequest = this.pendingRequests.get(requestId);
      if (originalRequest) {
        pending.resolve = originalRequest.resolve;
        pending.reject = originalRequest.reject;
        this.pendingRequests.delete(requestId);
      }

      this.pendingChunks.set(requestId, pending);
    }

    pending.chunks[chunkIndex] = content;

    const allReceived = pending.chunks.filter(Boolean).length === pending.totalChunks;
    if (allReceived) {
      clearTimeout(pending.timeoutId);
      const fullContent = pending.chunks.join("");

      try {
        const payload = JSON.parse(fullContent);
        pending.resolve(payload);
      } catch (err) {
        pending.reject(new Error(`Failed to parse grammar JSON: ${err}`));
      }

      this.pendingChunks.delete(requestId);
    }
  }

  static handleGrammarComplete(msg: GrammarCompleteMessage) {
    const { requestId } = msg;
    const pending = this.pendingChunks.get(requestId);

    if (pending) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error("Grammar stream incomplete"));
      this.pendingChunks.delete(requestId);
    }
  }
}
