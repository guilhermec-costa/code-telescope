import { PromiseBridgeResponse } from "../../shared/extension-webview-protocol";
import { WebviewToExtensionMessenger } from "./common/wv-to-extension-messenger";

type PendingRequest = {
  resolve: (data: any) => void;
  reject: (error: any) => void;
};

export class MessageBridge {
  private static pendingRequests = new Map<string, PendingRequest>();

  static request<T>(type: string, data?: any, timeout: number = 500): Promise<T> {
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
}
