import { beforeAll, describe, expect, it, vi } from "vitest";
import { WebviewToExtensionMessenger } from "../../core/common/wv-to-extension-messenger";
import { PreviewManager } from "../../core/render/preview-manager";

describe("PreviewManager lifecycle", () => {
  beforeAll(() => {
    vi.stubGlobal("__PREVIEW_CFG__", {
      horizontalScrollFraction: "1/4",
      verticalScrollFraction: "1/4",
      scrollBehavior: "auto",
    });
    document.body.innerHTML = '<div id="preview">old preview</div>';
  });

  it("cleans up the active adapter before clearing its markup", () => {
    const cleanup = vi.fn();
    const manager = PreviewManager.instance;
    manager.setAdapter({
      type: "preview.none",
      render: vi.fn(),
      cleanup,
    });

    manager.clearPreview();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(document.getElementById("preview")?.innerHTML).toBe("");
  });

  it("keeps preview chunks isolated by request id", async () => {
    const manager = PreviewManager.instance;
    vi.spyOn(WebviewToExtensionMessenger.instance, "requestSelectionPreviewData").mockReturnValue(42);
    manager.requestPreview("selected");

    await manager.handlePreviewChunk({
      type: "previewChunk",
      requestId: 41,
      chunkIndex: 0,
      totalChunks: 1,
      content: "stale",
    });
    expect((manager as any).chunkStore.received.size).toBe(0);

    await manager.handlePreviewChunk({
      type: "previewChunk",
      requestId: 42,
      chunkIndex: 1,
      totalChunks: 2,
      content: "second",
    });
    await manager.handlePreviewChunk({
      type: "previewChunk",
      requestId: 42,
      chunkIndex: 0,
      totalChunks: 2,
      content: "first",
    });

    expect((manager as any).chunkStore.chunks.join(" ")).toBe("first second");
    expect((manager as any).chunkStore.received.size).toBe(2);
  });
});
