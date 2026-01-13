import { FromWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { withPerformanceLogging } from "../../perf/perf-log";
import { IWebviewMessageHandler } from "../abstractions/webview-message-handler";
import { getRegisteredWebviewMessageHandlers } from "../decorators/webview-message-handler.decorator";
import { Logger } from "../log";

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
    const wrappedProvider = withPerformanceLogging(adapter);
    this.adapters.set(adapter.type, wrappedProvider);
    Logger.debug(`Registered fuzzy finder adapter: ${adapter.type} (${adapter.constructor?.name})`);
  }

  getAdapter(finderType: FromWebviewKindMessage["type"]): IWebviewMessageHandler | undefined {
    return this.adapters.get(finderType);
  }
}
