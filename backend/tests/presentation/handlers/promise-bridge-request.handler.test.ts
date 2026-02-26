import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { HighlighterAssetLoader } from "../../../core/highlighter/highlighter-asset-loader";
import { PromiseBridgeRequestHandler } from "../../../core/presentation/handlers/promise-bridge-request.handler";
import { WebviewController } from "../../../core/presentation/webview.controller";

vi.mock("@backend/core/presentation/webview.controller", () => ({
  WebviewController: {
    sendMessage: vi.fn(),
  },
}));

vi.mock("@backend/core/highlighter/highlighter-asset-loader", () => ({
  HighlighterAssetLoader: {
    getLanguageGrammar: vi.fn(),
    getThemeGrammar: vi.fn(),
  },
}));

vi.mock("@backend/core/highlighter/grammar-chunk-streamer", () => ({
  GrammarChunkStreamer: {
    shouldUseChunking: vi.fn().mockReturnValue(false),
  },
}));

describe("PromiseBridgeRequestHandler", () => {
  let handler: PromiseBridgeRequestHandler;
  let mockWebview: vscode.Webview;

  beforeEach(() => {
    handler = new PromiseBridgeRequestHandler();
    mockWebview = {} as vscode.Webview;
    vi.clearAllMocks();
  });

  it("should have correct type", () => {
    expect(handler.type).toBe("promiseBridgeRequest");
  });

  describe("handle - langGrammar", () => {
    it("should send language grammar payload when found", async () => {
      const mockGrammar = {
        id: "typescript",
        scopeName: "source.ts",
        grammar: { patterns: [] },
        embeddedLangs: [],
      };

      vi.mocked(HighlighterAssetLoader.getLanguageGrammar).mockResolvedValue(mockGrammar);

      const msg = {
        type: "promiseBridgeRequest" as const,
        requestId: "req-123",
        kind: "langGrammar" as const,
        data: "typescript",
      };

      await handler.handle(msg, mockWebview);

      expect(WebviewController.sendMessage).toHaveBeenCalledWith(mockWebview, {
        type: "promiseBridgeResponse",
        data: {
          requestId: "req-123",
          payload: mockGrammar,
        },
      });
    });

    it("should send error when language grammar not found", async () => {
      vi.mocked(HighlighterAssetLoader.getLanguageGrammar).mockResolvedValue(null);

      const msg = {
        type: "promiseBridgeRequest" as const,
        requestId: "req-456",
        kind: "langGrammar" as const,
        data: "unknown-lang",
      };

      await handler.handle(msg, mockWebview);

      expect(WebviewController.sendMessage).toHaveBeenCalledWith(mockWebview, {
        type: "promiseBridgeResponse",
        data: {
          requestId: "req-456",
          payload: null,
          error: "Grammar not found",
        },
      });
    });
  });

  describe("handle - themeGrammar", () => {
    it("should send theme grammar payload when found", async () => {
      const mockTheme: any = {
        name: "dark-plus",
        type: "dark",
        jsonData: { colors: {} },
      };

      vi.mocked(HighlighterAssetLoader.getThemeGrammar).mockResolvedValue(mockTheme);

      const msg = {
        type: "promiseBridgeRequest" as const,
        requestId: "req-789",
        kind: "themeGrammar" as const,
        data: "dark-plus",
      };

      await handler.handle(msg, mockWebview);

      expect(WebviewController.sendMessage).toHaveBeenCalledWith(mockWebview, {
        type: "promiseBridgeResponse",
        data: {
          requestId: "req-789",
          payload: mockTheme,
        },
      });
    });

    it("should send error when theme grammar not found", async () => {
      vi.mocked(HighlighterAssetLoader.getThemeGrammar).mockResolvedValue(null);

      const msg = {
        type: "promiseBridgeRequest" as const,
        requestId: "req-000",
        kind: "themeGrammar" as const,
        data: "unknown-theme",
      };

      await handler.handle(msg, mockWebview);

      expect(WebviewController.sendMessage).toHaveBeenCalledWith(mockWebview, {
        type: "promiseBridgeResponse",
        data: {
          requestId: "req-000",
          payload: null,
          error: "Grammar not found",
        },
      });
    });
  });
});
