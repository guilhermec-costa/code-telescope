import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("request selected option data", async () => {
    const data = { anyKey: "anyValue" };

    await handler.handle({ type: "optionSelected", data });

    expect(FuzzyFinderPanelController.instance!.provider.onSelect).toHaveBeenCalledExactlyOnceWith(data);
    expect(FuzzyFinderPanelController.instance!.dispose).toHaveBeenCalledOnce();
  });
});
