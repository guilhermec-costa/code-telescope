import { FromWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../abstractions/webview-message-handler";
import { getRegisteredWebviewMessageHandlers } from "../decorators/webview-message-handler.decorator";

export class WebviewMessageHandlerRegistry {
  private adapters = new Map<string, IWebviewMessageHandler>();
  private static _instance: WebviewMessageHandlerRegistry | undefined;

  private constructor() {
    for (const adapter of getRegisteredWebviewMessageHandlers()) {
      this.register(adapter);
    }
  }

  static get instance() {
    if (this._instance) return this._instance;

    this._instance = new WebviewMessageHandlerRegistry();
    return this._instance;
  }

  register(adapter: IWebviewMessageHandler) {
    this.adapters.set(adapter.type, adapter);
  }

  getAdapter(finderType: FromWebviewKindMessage["type"]): IWebviewMessageHandler | undefined {
    return this.adapters.get(finderType);
  }
}
