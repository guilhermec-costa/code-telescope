import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import { FinderResumeStore } from "../../../core/common/finder-resume.store";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { ClosePanelHandler } from "../../../core/presentation/handlers/close-panel.handler";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";

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
      dispose: vi.fn(),
      provider: {
        fuzzyAdapterType: "workspace.files",
        onPanelClose: vi.fn(),
      },
    },
  },
}));

vi.mock("@backend/utils/commands", () => ({
  execCmd: vi.fn(),
}));

describe("ClosePanelHandler", () => {
  let handler: ClosePanelHandler;
  let webview: vscode.Webview;
  const syncData = {
    query: "src",
    selectedValue: "README.md",
  };
  const expectedSnapshot = {
    providerType: "workspace.files",
    query: "src",
    selectedValue: "README.md",
  };

  beforeEach(() => {
    handler = new ClosePanelHandler();
    webview = {} as vscode.Webview;
    vi.clearAllMocks();
  });

  it("closes active panel and dispose the webview", async () => {
    await handler.handle({ type: "closePanel", data: { syncData } }, webview);
    expect(execCmd).toHaveBeenCalledWith(Globals.cmds.focusActiveFile);
    expect(FuzzyFinderPanelController.instance?.dispose).toHaveBeenCalled();
    expect(FinderResumeStore.instance.update).toHaveBeenCalledWith(expectedSnapshot);
  });

  it("closes active panel and calls onPanelClose", async () => {
    await handler.handle({ type: "closePanel", data: { syncData } }, webview);
    expect(FuzzyFinderPanelController.instance?.provider.onPanelClose).toHaveBeenCalled();
    expect(FinderResumeStore.instance.update).toHaveBeenCalledWith(expectedSnapshot);
  });
});
