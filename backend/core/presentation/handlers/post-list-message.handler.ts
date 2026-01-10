import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";
import { WebviewController } from "../webview.controller";

/**
 * Handles the webview notification indicating that Shiki
 * syntax highlighting has finished initializing.
 *
 * Triggers the initial query to populate the option list.
 */
@WebviewMessageHandler()
export class PostListMessageHandler implements IWebviewMessageHandler<"postHandleListMessage"> {
  readonly type = "postHandleListMessage";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "postHandleListMessage" }>, wv: vscode.Webview) {
    const provider = FuzzyFinderPanelController.instance!.provider;
    if (provider.postQueryHandler) {
      const result = await provider.postQueryHandler();
      await WebviewController.sendMessage(wv, {
        type: "postQueryHandler",
        action: result.action,
        data: result.data,
      });
    }
  }
}
