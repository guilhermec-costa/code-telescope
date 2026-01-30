import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { HighlighterAssetLoader } from "../../highlighter-asset-loader";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";
import { WebviewController } from "../webview.controller";

@WebviewMessageHandler()
export class PreviewRequestHandler implements IWebviewMessageHandler<"previewRequest"> {
  readonly type = "previewRequest";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "previewRequest" }>, wv: vscode.Webview) {
    const provider = FuzzyFinderPanelController.instance!.provider;
    const { selectedId } = msg.data;

    const previewData = await provider.getPreviewData(selectedId);

    previewData.languageGrammar = (await HighlighterAssetLoader.getLanguageGrammar(previewData.language!)) as any;

    // colorscheme finder provides its own theme grammar
    if (provider.fuzzyAdapterType !== "workspace.colorschemes") {
      previewData.themeGrammar = await HighlighterAssetLoader.getThemeGrammar();
    }

    await WebviewController.sendMessage(wv, {
      type: "previewUpdate",
      previewAdapterType: provider.previewAdapterType,
      data: previewData,
    });
  }
}
