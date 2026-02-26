import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { ExtensionConfigManager } from "../../../core/common/config-manager";
import { UpdateLayoutPropHandler } from "../../../core/presentation/handlers/update-layout-prop.handler";

vi.mock("@backend/core/common/config-manager", () => ({
  ExtensionConfigManager: {
    updateLayoutProperty: vi.fn(),
  },
}));

describe("UpdateLayoutPropHandler", () => {
  let handler: UpdateLayoutPropHandler;
  let mockWebview: vscode.Webview;

  beforeEach(() => {
    handler = new UpdateLayoutPropHandler();
    mockWebview = {} as vscode.Webview;
    vi.clearAllMocks();
  });

  it("should have correct type", () => {
    expect(handler.type).toBe("updateLayoutProp");
  });

  it("should update layout properties successfully", async () => {
    vi.mocked(ExtensionConfigManager.updateLayoutProperty).mockResolvedValue({ ok: true, value: true });

    const msg = {
      type: "updateLayoutProp" as const,
      data: [
        { property: "ivyHeightPct" as const, value: 75 },
        { property: "leftSideWidthPct" as const, value: 50 },
      ],
    };

    await handler.handle(msg, mockWebview);

    expect(ExtensionConfigManager.updateLayoutProperty).toHaveBeenCalledTimes(2);
    expect(ExtensionConfigManager.updateLayoutProperty).toHaveBeenCalledWith("ivyHeightPct", 75);
    expect(ExtensionConfigManager.updateLayoutProperty).toHaveBeenCalledWith("leftSideWidthPct", 50);
  });

  it("should show error message when update fails", async () => {
    vi.mocked(ExtensionConfigManager.updateLayoutProperty).mockResolvedValue({
      ok: false,
      error: "Failed to update property",
    });

    const msg = {
      type: "updateLayoutProp" as const,
      data: [{ property: "rightSideWidthPct" as const, value: 60 }],
    };

    await handler.handle(msg, mockWebview);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Failed to update property");
  });

  it("should handle multiple properties with mixed results", async () => {
    vi.mocked(ExtensionConfigManager.updateLayoutProperty)
      .mockResolvedValueOnce({ ok: true, value: true })
      .mockResolvedValueOnce({ ok: false, error: "Error on second" });

    const msg = {
      type: "updateLayoutProp" as const,
      data: [
        { property: "ivyHeightPct" as const, value: 80 },
        { property: "leftSideWidthPct" as const, value: 40 },
      ],
    };

    await handler.handle(msg, mockWebview);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Error on second");
  });
});
