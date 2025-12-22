import { describe, expect, it, vi } from "vitest";
import { VSCodeEventsManager } from "../../../core/common/code-events-manager";
import { WebviewDOMReadyHandler } from "../../../core/presentation/handlers/webview-dom-ready.handler";

vi.mock("@backend/core/common/code-events-manager", () => ({
  VSCodeEventsManager: {
    emitInitialEvents: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("WebviewDOMReadyHandler", () => {
  it("should emit initial vscode events when webview is ready", async () => {
    const handler = new WebviewDOMReadyHandler();

    await handler.handle();

    expect(VSCodeEventsManager.emitInitialEvents).toHaveBeenCalledTimes(1);
  });
});
