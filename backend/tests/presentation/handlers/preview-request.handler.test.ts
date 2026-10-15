import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { PreviewRequestHandler } from "../../../core/presentation/handlers/preview-request.handler";
import { PreviewRequestState } from "../../../core/presentation/preview-request-state";
import { WebviewController } from "../../../core/presentation/webview.controller";

vi.mock("@backend/utils/theme", () => ({
  getCurThemeMetadata: vi.fn().mockResolvedValue({}),
}));

vi.mock("@backend/core/highlighter-asset-loader", () => {
  return {
    HighlighterAssetLoader: vi.fn(
      class {
        static getLanguageGrammar = vi.fn().mockResolvedValue({});
        static getThemeGrammar = vi.fn().mockResolvedValue({});
      },
    ),
  };
});

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: {
      provider: {
        onSelect: vi.fn().mockResolvedValue(undefined),
        getPreviewData: vi.fn().mockResolvedValue({ mocked: true }),
      },
      dispose: vi.fn().mockResolvedValueOnce({
        catch: vi.fn(),
      }),
    },
  },
}));

vi.mock("@backend/core/presentation/webview.controller", () => ({
  WebviewController: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("PreviewRequestHandler", () => {
  let handler: PreviewRequestHandler;
  let webview: vscode.Webview;

  beforeEach(() => {
    vi.clearAllMocks();
    PreviewRequestState.resetPreviewRequestId();
    handler = new PreviewRequestHandler();
    webview = {} as vscode.Webview;
  });

  it("request selected option data", async () => {
    const data: any = {
      selectedId: "1",
      requestId: 1,
    };

    const providerMock = FuzzyFinderPanelController.instance!.provider;
    await handler.handle({ type: "previewRequest", data }, webview);
    expect(providerMock.getPreviewData).toHaveBeenCalledTimes(1);

    expect(WebviewController.sendMessage).toHaveBeenCalledWith(
      webview,
      expect.objectContaining({
        type: "fullPreviewUpdate",
        previewAdapterType: providerMock.fuzzyAdapterType,
        data: {
          mocked: true,
        },
      }),
    );
  });

  it("drops a stale preview that finishes after a newer request", async () => {
    const providerMock = FuzzyFinderPanelController.instance!.provider;
    let resolveOld!: (value: any) => void;
    let resolveNew!: (value: any) => void;
    vi.mocked(providerMock.getPreviewData)
      .mockReturnValueOnce(new Promise((resolve) => (resolveOld = resolve)))
      .mockReturnValueOnce(new Promise((resolve) => (resolveNew = resolve)));

    const oldRequest = handler.handle({ type: "previewRequest", data: { selectedId: "old", requestId: 10 } }, webview);
    const newRequest = handler.handle({ type: "previewRequest", data: { selectedId: "new", requestId: 11 } }, webview);

    resolveNew({ kind: "text", content: "new" });
    await newRequest;
    resolveOld({ kind: "text", content: "old" });
    await oldRequest;

    expect(WebviewController.sendMessage).toHaveBeenCalledTimes(1);
    expect(WebviewController.sendMessage).toHaveBeenCalledWith(
      webview,
      expect.objectContaining({ requestId: 11, data: expect.objectContaining({ content: "new" }) }),
    );
  });
});
