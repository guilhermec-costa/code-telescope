import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";

@WebviewMessageHandler()
export class ClosePanelHandler implements IWebviewMessageHandler<"closePanel"> {
  readonly type = "closePanel";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "closePanel" }>, wv: vscode.Webview) {
    FuzzyFinderPanelController.instance!.dispose();
    await execCmd(Globals.cmds.focusActiveFile);
  }
}
