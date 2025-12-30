import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { ExtensionConfigManager } from "../../common/config-manager";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";

@WebviewMessageHandler()
export class UpdateLayoutPropHandler implements IWebviewMessageHandler<"updateLayoutProp"> {
  readonly type = "updateLayoutProp";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "updateLayoutProp" }>, wv: vscode.Webview) {
    for (const { property, value } of msg.data) {
      const updateResult = await ExtensionConfigManager.updateLayoutProperty(property, value);
      if (!updateResult.ok) {
        await vscode.window.showErrorMessage(updateResult.error);
      }
    }
  }
}
