import { describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { HighlightCacheMessage } from "../../../../shared/extension-webview-protocol";
import { HighlightContentCache } from "../../../core/common/cache/highlight-content.cache";
import { HighlightCacheHandler } from "../../../core/presentation/handlers/highlight-cache.handler";

vi.mock("@backend/core/common/cache/highlight-content.cache", () => {
  return {
    HighlightContentCache: {
      instance: {
        set: vi.fn(),
      },
    },
  };
});

describe("HighlightCacheHandler", () => {
  it("should cache highlighted content with line in key", async () => {
    const handler = new HighlightCacheHandler();

    const msg: HighlightCacheMessage = {
      type: "highlightCache",
      data: {
        content: "<html>code</html>",
        path: "/file.ts",
        highlightedLine: 10,
      },
    };

    await handler.handle(msg, {} as vscode.Webview);

    expect(HighlightContentCache.instance.set).toHaveBeenCalledWith("/file.ts:10", "<html>code</html>");
  });

  it("should cache highlighted content without line in key", async () => {
    const handler = new HighlightCacheHandler();

    const msg: HighlightCacheMessage = {
      type: "highlightCache",
      data: {
        content: "<html>code</html>",
        path: "/file.ts",
      },
    };

    await handler.handle(msg, {} as vscode.Webview);

    expect(HighlightContentCache.instance.set).toHaveBeenCalledWith("/file.ts", "<html>code</html>");
  });
});
