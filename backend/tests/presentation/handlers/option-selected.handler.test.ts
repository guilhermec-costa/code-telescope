import { beforeEach, describe, expect, it, vi } from "vitest";
import { WindowConfig } from "../../../../shared/exchange/extension-config";
import { ExtensionConfigManager } from "../../../core/common/config-manager";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { OptionSelectedHandler } from "../../../core/presentation/handlers/option-selected.handler";

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: {
      provider: {
        onSelect: vi.fn().mockResolvedValue(undefined),
      },
      dispose: vi.fn(),
    },
  },
}));

describe("OptionSelectedHandler", () => {
  let handler: OptionSelectedHandler;

  beforeEach(() => {
    handler = new OptionSelectedHandler();
  });

  it("request selected option data and dispose the webview", async () => {
    const data = { anyKey: "anyValue" };

    const extConfigSpy = vi.spyOn(ExtensionConfigManager, "window", "get").mockReturnValue({
      closeBehaviorOnSelection: "dispose",
    } as WindowConfig);
    await handler.handle({ type: "optionSelected", data });

    expect(FuzzyFinderPanelController.instance!.provider.onSelect).toHaveBeenCalledExactlyOnceWith(data);
    expect(FuzzyFinderPanelController.instance?.dispose).toHaveBeenCalled();
    expect(extConfigSpy).toHaveBeenCalled();
  });

  it("request selected option and dot not dispose the webview", async () => {
    const data = { anyKey: "anyValue" };

    vi.spyOn(ExtensionConfigManager, "window", "get").mockReturnValue({
      closeBehaviorOnSelection: "minimize",
    } as WindowConfig);
    await handler.handle({ type: "optionSelected", data });

    expect(FuzzyFinderPanelController.instance?.dispose).not.toHaveBeenCalled();
  });
});
