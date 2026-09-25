import { beforeEach, describe, expect, it, vi } from "vitest";
import { DoomRendererAdapter } from "../../../core/adapters/preview-renderer/doom.renderer-adapter";

const startDoom = vi.hoisted(() => vi.fn());

vi.mock("../../../core/doom/doom-runtime", () => ({ startDoom }));

const previewData = {
  content: {
    enginePath: "vendor/doom/doom.wasm",
    musicEnginePath: "vendor/doom/doom-music.wasm",
    wadPath: "vendor/doom/doom1.wad",
  },
};

describe("DoomRendererAdapter lifecycle", () => {
  let adapter: DoomRendererAdapter;
  let container: HTMLElement;

  beforeEach(() => {
    startDoom.mockReset();
    document.body.className = "";
    adapter = new DoomRendererAdapter();
    container = document.createElement("div");
    document.body.append(container);
  });

  it("stops the running session and releases the game UI on cleanup", async () => {
    const session = { capturePointer: vi.fn(), stop: vi.fn() };
    startDoom.mockResolvedValue(session);

    await adapter.render(container, previewData);
    container.querySelector<HTMLButtonElement>(".doom-launch")?.click();
    await vi.waitFor(() => expect(startDoom).toHaveBeenCalledOnce());

    adapter.cleanup();

    expect(session.stop).toHaveBeenCalledOnce();
    expect(container.classList.contains("doom-preview")).toBe(false);
    expect(document.body.classList.contains("game-active")).toBe(false);
  });

  it("aborts a pending launch and rejects a stale session", async () => {
    let finishLaunch!: (session: { capturePointer(): Promise<void>; stop(): void }) => void;
    startDoom.mockReturnValue(
      new Promise((resolve) => {
        finishLaunch = resolve;
      }),
    );

    await adapter.render(container, previewData);
    container.querySelector<HTMLButtonElement>(".doom-launch")?.click();
    await vi.waitFor(() => expect(startDoom).toHaveBeenCalledOnce());
    const signal = startDoom.mock.calls[0][0].signal as AbortSignal;
    const staleSession = { capturePointer: vi.fn(), stop: vi.fn() };

    adapter.cleanup();
    finishLaunch(staleSession);

    expect(signal.aborted).toBe(true);
    await vi.waitFor(() => expect(staleSession.stop).toHaveBeenCalledOnce());
  });
});
