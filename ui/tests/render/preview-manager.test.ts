import { beforeAll, describe, expect, it, vi } from "vitest";
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
});
