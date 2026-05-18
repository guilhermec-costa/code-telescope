import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { FinderResumeStore } from "../../common/finder-resume.store";
import { PreContextManager } from "../../common/pre-context";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";

@WebviewMessageHandler()
export class ClosePanelHandler implements IWebviewMessageHandler<"closePanel"> {
  readonly type = "closePanel";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "closePanel" }>, wv: vscode.Webview) {
    PreContextManager.instance.focusOnCapture();
    const provider = FuzzyFinderPanelController.instance!.provider;
    FinderResumeStore.instance.update({
      providerType: provider.fuzzyAdapterType,
      ...msg.data.syncData,
    });

    FuzzyFinderPanelController.instance!.dispose();
    await execCmd(Globals.cmds.focusActiveFile);
    await provider.onPanelClose?.();
  }
}
