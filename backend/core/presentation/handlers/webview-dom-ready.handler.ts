import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";
import { WebviewController } from "../webview.controller";

@WebviewMessageHandler()
export class WebviewDOMReadyHandler implements IWebviewMessageHandler<"webviewDOMReady"> {
  readonly type = "webviewDOMReady";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "webviewDOMReady" }>, wv: vscode.Webview) {
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
