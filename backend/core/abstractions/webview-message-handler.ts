import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../shared/extension-webview-protocol";

export interface IWebviewMessageHandler<T extends FromWebviewKindMessage["type"] = any> {
  readonly type: T;
  handle(msg: Extract<FromWebviewKindMessage, { type: T }>, webview: vscode.Webview): Promise<void>;
}
