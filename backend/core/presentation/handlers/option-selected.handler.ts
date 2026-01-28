import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { ExtensionConfigManager } from "../../common/config-manager";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";

@WebviewMessageHandler()
export class OptionSelectedHandler implements IWebviewMessageHandler<"optionSelected"> {
  readonly type = "optionSelected";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "optionSelected" }>) {
    const provider = FuzzyFinderPanelController.instance!.provider;
    const { closeBehaviorOnSelection } = ExtensionConfigManager.window;
    if (closeBehaviorOnSelection === "dispose") {
      FuzzyFinderPanelController.instance!.dispose();
    }
    await provider.onSelect(msg.data);
  }
}
