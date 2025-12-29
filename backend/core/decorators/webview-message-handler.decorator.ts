import { IWebviewMessageHandler } from "../abstractions/webview-message-handler";

const GlobalWebviewMessageHandlerRegistry: IWebviewMessageHandler[] = [];

/**
 * Decorator used to register a webview message handler.
 *
 * Instantiates the handler and adds it to the global registry.
 */
export function WebviewMessageHandler() {
  return function <T extends { new (): IWebviewMessageHandler }>(constructor: T) {
    const instance = new constructor();
    GlobalWebviewMessageHandlerRegistry.push(instance);
  };
}

/**
 * Returns all registered webview message handlers.
 */
export function getRegisteredWebviewMessageHandlers() {
  return GlobalWebviewMessageHandlerRegistry;
}
