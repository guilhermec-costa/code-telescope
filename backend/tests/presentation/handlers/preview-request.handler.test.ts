import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { PreviewRequestMessage } from "../../../../shared/extension-webview-protocol";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { PreviewRequestHandler } from "../../../core/presentation/handlers/preview-request.handler";
import { WebviewController } from "../../../core/presentation/webview.controller";

vi.mock("@backend/utils/theme", () => ({
  getCurThemeMetadata: vi.fn().mockResolvedValue({}),
}));

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
    handler = new PreviewRequestHandler();
    webview = {} as vscode.Webview;
  });

  it("request selected option data", async () => {
    const data: PreviewRequestMessage["data"] = {
      selectedId: "1",
    };

    const providerMock = FuzzyFinderPanelController.instance!.provider;
    await handler.handle({ type: "previewRequest", data }, webview);
    expect(providerMock.getPreviewData).toHaveBeenCalledTimes(1);

    expect(WebviewController.sendMessage).toHaveBeenCalledWith(
      webview,
      expect.objectContaining({
        type: "previewUpdate",
        data: { mocked: true, metadata: {} },
      }),
    );
  });
});
