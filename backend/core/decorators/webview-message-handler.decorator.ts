import { IWebviewMessageHandler } from "../abstractions/webview-message-handler";

const GlobalWebviewMessageHandlerRegistry: IWebviewMessageHandler[] = [];

export function WebviewMessageHandler() {
  return function <T extends { new (): IWebviewMessageHandler }>(constructor: T) {
    const instance = new constructor();
    GlobalWebviewMessageHandlerRegistry.push(instance);
  };
}

export function getRegisteredWebviewMessageHandlers() {
  return GlobalWebviewMessageHandlerRegistry;
}
