import { describe, expect, it, vi } from "vitest";
import { EventManager } from "../../../core/common/event-manager";
import { WebviewDOMReadyHandler } from "../../../core/presentation/handlers/webview-dom-ready.handler";

vi.mock("@backend/core/common/event-manager", () => ({
  EventManager: {
    emitInitialEvents: vi.fn().mockResolvedValue(undefined),
  },
}));

describe("WebviewDOMReadyHandler", () => {
  it("should emit initial vscode events when webview is ready", async () => {
    const handler = new WebviewDOMReadyHandler();

    await handler.handle();

    expect(EventManager.emitInitialEvents).toHaveBeenCalledTimes(1);
  });
});
