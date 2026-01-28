import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import { WindowConfig } from "../../../../shared/exchange/extension-config";
import { ExtensionConfigManager } from "../../../core/common/config-manager";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { ClosePanelHandler } from "../../../core/presentation/handlers/close-panel.handler";
import { Globals } from "../../../globals";
import { execCmd } from "../../../utils/commands";

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: {
      dispose: vi.fn(),
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
  });

  it("closes active panel and dispose the webview", async () => {
    vi.spyOn(ExtensionConfigManager, "window", "get").mockReturnValue({
      closeBehaviorOnClose: "dispose",
    } as WindowConfig);
    await handler.handle({ type: "closePanel" }, webview);
    expect(execCmd).toHaveBeenCalledWith(Globals.cmds.focusActiveFile);
    expect(FuzzyFinderPanelController.instance?.dispose).toHaveBeenCalled();
  });

  it("closes active panel and dot not dispose the webview", async () => {
    vi.spyOn(ExtensionConfigManager, "window", "get").mockReturnValue({
      closeBehaviorOnClose: "minimize",
    } as WindowConfig);
    await handler.handle({ type: "closePanel" }, webview);
    expect(execCmd).toHaveBeenCalledWith(Globals.cmds.focusActiveFile);
    expect(FuzzyFinderPanelController.instance?.dispose).not.toHaveBeenCalled();
  });
});
