import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { FuzzyFinderPanelController } from "../../../core/presentation/fuzzy-panel.controller";
import { DynamicSearchHandler } from "../../../core/presentation/handlers/dynamic-search.handler";
import { WebviewController } from "../../../core/presentation/webview.controller";

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: {
      provider: {
        supportsDynamicSearch: true,
        searchOnDynamicMode: vi.fn(),
        fuzzyAdapterType: "workspace.text",
      },
    },
  },
}));

vi.mock("@backend/core/presentation/webview.controller", () => ({
  WebviewController: {
    sendMessage: vi.fn(),
  },
}));

describe("DynamicSearchHandler", () => {
  let handler: DynamicSearchHandler;
  let webview: vscode.Webview;

  beforeEach(() => {
    handler = new DynamicSearchHandler();
    webview = {} as vscode.Webview;
    vi.clearAllMocks();
  });

  it("should call dynamic search and send option list", async () => {
    const providerMock = FuzzyFinderPanelController.instance!.provider;
    const dynSearchResult = {
      results: ["a", "b"],
      query: "te",
    };
    const query = "te";

    vi.mocked(providerMock.searchOnDynamicMode!).mockResolvedValue(dynSearchResult);

    await handler.handle(
      {
        type: "dynamicSearch",
        query,
      } as any,
      webview,
    );

    expect(providerMock.searchOnDynamicMode).toHaveBeenCalledWith(query);

    expect(WebviewController.sendMessage).toHaveBeenCalledWith(webview, {
      type: "optionList",
      data: dynSearchResult,
      fuzzyProviderType: providerMock.fuzzyAdapterType,
      isChunk: false,
    });
  });

  it("should do nothing if provider does not support dynamic search", async () => {
    const providerMock = FuzzyFinderPanelController.instance!.provider;
    providerMock.supportsDynamicSearch = false;

    await handler.handle(
      {
        type: "dynamicSearch",
        query: "test",
      } as any,
      webview,
    );

    expect(WebviewController.sendMessage).not.toHaveBeenCalled();
  });
});
