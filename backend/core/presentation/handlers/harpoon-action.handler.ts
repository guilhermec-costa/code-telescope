import * as vscode from "vscode";
import { HarpoonMark } from "../../../../shared/exchange/harpoon";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { HarpoonOrchestrator } from "../../../harpoon/orchestrator";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { HarpoonProvider } from "../../finders/harpoon.finder";
import { FuzzyFinderAdapterRegistry } from "../../registry/fuzzy-provider.registry";
import { WebviewController } from "../webview.controller";

@WebviewMessageHandler()
export class HarpoonActionHandler implements IWebviewMessageHandler<"harpoonAction"> {
  readonly type = "harpoonAction";
  private cutMark: HarpoonMark | null = null;

  async handle(msg: Extract<FromWebviewKindMessage, { type: "harpoonAction" }>, wv: vscode.Webview) {
    const orchestrator = HarpoonOrchestrator.getInstance(HarpoonProvider.context);

    switch (msg.action) {
      case "delete": {
        const marks = orchestrator.getMarks();
        this.cutMark = marks[msg.index] ?? null;
        await orchestrator.removeFile(msg.index);
        break;
      }
      case "paste": {
        if (!this.cutMark) return;
        await orchestrator.insertAt(this.cutMark, msg.index);
        this.cutMark = null;
        break;
      }
    }

    const provider = FuzzyFinderAdapterRegistry.instance.getAdapter<HarpoonProvider>("harpoon.marks")!;
    const data = await provider.querySelectableOptions();
    await WebviewController.sendMessage(wv, {
      type: "optionList",
      data,
      fuzzyProviderType: "harpoon.marks",
      dataAdapterType: "harpoonMarksAdapter",
      totalLimit: data.marks.length,
    });
  }
}
