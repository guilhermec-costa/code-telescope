import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebviewSessionState } from "../../../../shared/extension-webview-protocol";
import { FinderResumeStore } from "../../../core/common/finder-resume.store";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { OptionSelectedHandler } from "../../../core/presentation/handlers/option-selected.handler";

vi.mock("@backend/core/common/finder-resume.store", () => ({
  FinderResumeStore: {
    instance: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: {
      provider: {
        fuzzyAdapterType: "workspace.files",
        onSelect: vi.fn().mockResolvedValue(undefined),
        onPanelClose: vi.fn(),
      },
      dispose: vi.fn(),
    },
  },
}));

describe("OptionSelectedHandler", () => {
  let handler: OptionSelectedHandler;
  const syncData: WebviewSessionState = {
    query: "",
    selectedValue: { relativePath: "src/index.ts" },
  };
  const expectedSnapshot = {
    providerType: "workspace.files",
    query: "",
    selectedValue: { relativePath: "src/index.ts" },
  };

  beforeEach(() => {
    handler = new OptionSelectedHandler();
    vi.clearAllMocks();
  });

  it("request selected option data and dispose the webview", async () => {
    const data = { anyKey: "anyValue" };

    await handler.handle({ type: "optionSelected", option: data, syncData });

    expect(FuzzyFinderPanelController.instance!.provider.onSelect).toHaveBeenCalledExactlyOnceWith(data);
    expect(FuzzyFinderPanelController.instance?.dispose).toHaveBeenCalled();
    expect(FinderResumeStore.instance.update).toHaveBeenCalledWith(expectedSnapshot);
  });

  it("calls onPanelClose after selection", async () => {
    const data = { anyKey: "anyValue" };

    await handler.handle({ type: "optionSelected", option: data, syncData });

    expect(FuzzyFinderPanelController.instance?.provider.onPanelClose).toHaveBeenCalled();
    expect(FinderResumeStore.instance.update).toHaveBeenCalledWith(expectedSnapshot);
  });
});
