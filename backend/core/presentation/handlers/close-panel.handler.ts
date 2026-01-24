import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { PreContextManager } from "../../common/pre-context";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";

@WebviewMessageHandler()
export class ClosePanelHandler implements IWebviewMessageHandler<"closePanel"> {
  readonly type = "closePanel";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "closePanel" }>, wv: vscode.Webview) {
    PreContextManager.instance.focusOnCapture();
    // FuzzyFinderPanelController.instance!.dispose();
    await execCmd(Globals.cmds.focusActiveFile);
  }
}
