import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { ExtensionConfigManager } from "../../common/config-manager";
import { PreContextManager } from "../../common/pre-context";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";

@WebviewMessageHandler()
export class ClosePanelHandler implements IWebviewMessageHandler<"closePanel"> {
  readonly type = "closePanel";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "closePanel" }>, wv: vscode.Webview) {
    PreContextManager.instance.focusOnCapture();
    const { closeBehaviorOnClose } = ExtensionConfigManager.window;
    if (closeBehaviorOnClose === "dispose") {
      FuzzyFinderPanelController.instance!.dispose();
    }
    await execCmd(Globals.cmds.focusActiveFile);
  }
}
