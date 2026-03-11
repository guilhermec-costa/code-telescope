import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { ClosePanelHandler } from "../../../core/presentation/handlers/close-panel.handler";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: {
      dispose: vi.fn(),
      provider: {
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

  beforeEach(() => {
    handler = new ClosePanelHandler();
    webview = {} as vscode.Webview;
    vi.clearAllMocks();
  });

  it("closes active panel and dispose the webview", async () => {
    await handler.handle({ type: "closePanel" }, webview);
    expect(execCmd).toHaveBeenCalledWith(Globals.cmds.focusActiveFile);
    expect(FuzzyFinderPanelController.instance?.dispose).toHaveBeenCalled();
  });

  it("closes active panel and calls onPanelClose", async () => {
    await handler.handle({ type: "closePanel" }, webview);
    expect(FuzzyFinderPanelController.instance?.provider.onPanelClose).toHaveBeenCalled();
  });
});
