import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
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

  it("closes active panel", async () => {
    await handler.handle({ type: "closePanel" }, webview);
    expect(execCmd).toHaveBeenCalledWith(Globals.cmds.focusActiveFile);
  });
});
