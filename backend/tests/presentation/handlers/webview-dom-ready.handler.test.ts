import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { isChunkableProvider } from "../../../core/abstractions/chunkable-provider";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { WebviewDOMReadyHandler } from "../../../core/presentation/handlers/webview-dom-ready.handler";
import { PreviewRequestState } from "../../../core/presentation/preview-request-state";
import { WebviewController } from "../../../core/presentation/webview.controller";

vi.mock("@backend/core/abstractions/chunkable-provider", () => ({
  isChunkableProvider: vi.fn(),
}));

vi.mock("@backend/core/chunk-streamer", () => {
  return {
    ChunkStreamer: class {
      streamFromGenerator = vi.fn().mockResolvedValue(undefined);
      streamConcurrently = vi.fn().mockResolvedValue(undefined);
    },
  };
});

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: {
      provider: {
        querySelectableOptions: vi.fn(),
        fuzzyAdapterType: "files",
        dataAdapterType: "ws",
        chunkSize: 2000,
        mapChunk: vi.fn(),
        concurrency: 4,
      },
    },
  },
}));

vi.mock("@backend/core/presentation/webview.controller", () => ({
  WebviewController: {
    sendMessage: vi.fn(),
  },
}));

vi.mock("@backend/core/presentation/preview-request-state", () => ({
  PreviewRequestState: {
    resetPreviewRequestId: vi.fn(),
  },
}));

describe("WebviewDOMReadyHandler", () => {
  let handler: WebviewDOMReadyHandler;
  let mockWebview: vscode.Webview;

  beforeEach(() => {
    handler = new WebviewDOMReadyHandler();
    mockWebview = {} as vscode.Webview;
    vi.clearAllMocks();
  });

  it("should have correct type", () => {
    expect(handler.type).toBe("webviewDOMReady");
  });

  it("should reset preview request state on handle", async () => {
    vi.mocked(isChunkableProvider).mockReturnValue(false);

    const mockProvider = FuzzyFinderPanelController.instance!.provider;
    vi.mocked(mockProvider.querySelectableOptions).mockResolvedValue([{ label: "item1" }]);

    await handler.handle({ type: "webviewDOMReady" }, mockWebview);

    expect(PreviewRequestState.resetPreviewRequestId).toHaveBeenCalled();
  });

  it("should send options directly when provider is not chunkable", async () => {
    vi.mocked(isChunkableProvider).mockReturnValue(false);

    const mockProvider = FuzzyFinderPanelController.instance!.provider;
    const mockItems = [{ label: "item1" }, { label: "item2" }];
    vi.mocked(mockProvider.querySelectableOptions).mockResolvedValue(mockItems);

    await handler.handle({ type: "webviewDOMReady" }, mockWebview);

    expect(WebviewController.sendMessage).toHaveBeenCalledWith(mockWebview, {
      type: "optionList",
      data: mockItems,
      fuzzyProviderType: "files",
      dataAdapterType: "ws",
      totalLimit: 2,
    });
  });

  it("should create chunk streamer when provider is chunkable", async () => {
    vi.mocked(isChunkableProvider).mockReturnValue(true);

    const mockProvider = FuzzyFinderPanelController.instance!.provider;
    const mockItems = [{ label: "item1" }, { label: "item2" }];
    vi.mocked(mockProvider.querySelectableOptions).mockResolvedValue(mockItems);

    await handler.handle({ type: "webviewDOMReady" }, mockWebview);

    expect(FuzzyFinderPanelController.instance!.provider.querySelectableOptions).toHaveBeenCalled();
  });

  it("should handle array-like result for totalLimit", async () => {
    vi.mocked(isChunkableProvider).mockReturnValue(false);

    const mockProvider = FuzzyFinderPanelController.instance!.provider;
    const mockItems = [{ label: "item1" }, { label: "item2" }, { label: "item3" }];
    vi.mocked(mockProvider.querySelectableOptions).mockResolvedValue(mockItems);

    await handler.handle({ type: "webviewDOMReady" }, mockWebview);

    expect(WebviewController.sendMessage).toHaveBeenCalledWith(mockWebview, expect.objectContaining({ totalLimit: 3 }));
  });
});
