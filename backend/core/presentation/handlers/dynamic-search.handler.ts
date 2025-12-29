import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";
import { WebviewController } from "../webview.controller";

/**
 * Handles dynamic search requests coming from the webview.
 *
 * Dispatches the query to the active fuzzy finder provider
 * and returns updated option lists in real time.
 */
@WebviewMessageHandler()
export class DynamicSearchHandler implements IWebviewMessageHandler<"dynamicSearch"> {
  readonly type = "dynamicSearch";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "dynamicSearch" }>, wv: vscode.Webview) {
    const provider = FuzzyFinderPanelController.instance!.provider;

    if (!provider.supportsDynamicSearch || !provider.searchOnDynamicMode) return;

    const results = await provider.searchOnDynamicMode(msg.query);

    await WebviewController.sendMessage(wv, {
      type: "optionList",
      data: results,
      fuzzyProviderType: provider.fuzzyAdapterType,
    });
  }
}
