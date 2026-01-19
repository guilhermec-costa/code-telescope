import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { PreContextManager } from "../../common/pre-context";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";

@WebviewMessageHandler()
export class ClosePanelHandler implements IWebviewMessageHandler<"closePanel"> {
  readonly type = "closePanel";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "closePanel" }>, wv: vscode.Webview) {
    const ctx = PreContextManager.instance.getContext();
    if (ctx) {
      const { document, position } = ctx;
      await vscode.workspace.openTextDocument(document.uri);
      const editor = await vscode.window.showTextDocument(document);

      editor.selection = new vscode.Selection(position, position);
    }
    FuzzyFinderPanelController.instance!.dispose();
    await execCmd(Globals.cmds.focusActiveFile);
  }
}
