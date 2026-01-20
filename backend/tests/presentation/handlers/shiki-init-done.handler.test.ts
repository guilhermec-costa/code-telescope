import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as vscode from "vscode";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { HighlighterInitDoneHandler } from "../../../core/presentation/handlers/highlighter-init-done.handler";
import { WebviewController } from "../../../core/presentation/webview.controller";

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: {
      provider: {
        fuzzyAdapterType: "workspace.files",
        querySelectableOptions: vi.fn().mockResolvedValue([{ label: "file1" }, { label: "file2" }]),
      },
    },
  },
}));

describe("HighlighterInitDoneHandler", () => {
  let handler: HighlighterInitDoneHandler;
  let webview: vscode.Webview;

  beforeEach(() => {
    handler = new HighlighterInitDoneHandler();
    webview = {} as vscode.Webview;

    vi.spyOn(WebviewController, "sendMessage").mockResolvedValue();
  });

  it("queries selectable options and sends optionList message to webview", async () => {
    await handler.handle({ type: "highlighterInitDone" }, webview);

    const provider = FuzzyFinderPanelController.instance!.provider;

    expect(provider.querySelectableOptions).toHaveBeenCalledOnce();

    expect(WebviewController.sendMessage).toHaveBeenCalledWith(webview, {
      type: "optionList",
      data: [{ label: "file1" }, { label: "file2" }],
      fuzzyProviderType: "workspace.files",
      isChunk: false,
    });
  });
});
