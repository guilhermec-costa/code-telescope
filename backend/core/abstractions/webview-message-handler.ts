import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../shared/extension-webview-protocol";

/**
 * Handles messages sent from the webview to the extension.
 *
 * Each implementation is responsible for handling exactly one
 * message `type`
 *
 * @typeParam T The specific message `type` this handler is responsible for
 */
export interface IWebviewMessageHandler<T extends FromWebviewKindMessage["type"] = any> {
  /**
   * The message type this handler is responsible for.
   */
  readonly type: T;

  /**
   * Handles a message sent from the webview.
   *
   * This method is typically used to:
   * - trigger extension-side actions
   * - query providers or services
   * - send responses back to the webview
   */
  handle(msg: Extract<FromWebviewKindMessage, { type: T }>, webview: vscode.Webview): Promise<void>;
}
