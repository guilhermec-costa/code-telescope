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
export class HighlighterInitDoneHandler implements IWebviewMessageHandler<"highlighterInitDone"> {
  readonly type = "highlighterInitDone";

  async handle(_msg: Extract<FromWebviewKindMessage, { type: "highlighterInitDone" }>, wv: vscode.Webview) {
    const provider = FuzzyFinderPanelController.instance!.provider;
    const items = await provider.querySelectableOptions();

    await WebviewController.sendMessage(wv, {
      type: "optionList",
      data: items,
      fuzzyProviderType: provider.fuzzyAdapterType,
      isChunk: false,
    });
  }
}
