import { WebviewMessage } from "@shared/extension-webview-protocol";

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): any;
  setState(state: any): void;
};
