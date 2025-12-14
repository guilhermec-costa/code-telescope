import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";

export interface WebviewMessageHandler<T extends FromWebviewKindMessage["type"]> {
  type: T;
  handle(msg: Extract<FromWebviewKindMessage, { type: T }>): Promise<void>;
}
