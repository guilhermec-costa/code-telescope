import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { FinderResumeStore } from "../../common/finder-resume.store";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";

@WebviewMessageHandler()
export class OptionSelectedHandler implements IWebviewMessageHandler<"optionSelected"> {
  readonly type = "optionSelected";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "optionSelected" }>) {
    const provider = FuzzyFinderPanelController.instance!.provider;
    FinderResumeStore.instance.update({
      providerType: provider.fuzzyAdapterType,
      ...msg.syncData,
    });

    FuzzyFinderPanelController.instance!.dispose();
    await provider.onSelect(msg.option);

    // It is important to perform this action after the selection logic completes,
    // because the selection logic may depend on resources that are cleaned up by onPanelClose.
    await provider.onPanelClose?.();
  }
}
