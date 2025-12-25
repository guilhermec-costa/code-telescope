import { beforeEach, describe, expect, it, Mock, type Mocked, vi } from "vitest";
import { DIContainer } from "../core/common/di-container";
import { WebviewController } from "../core/common/webview.controller";

vi.mock("@ui/core/common/di-container", () => {
  return {
    DIContainer: vi.fn(
      class {
        init = vi.fn().mockResolvedValue(undefined);
        previewManager = {};
        optionListManager = {};
        keyboardHandler = {};
      },
    ),
  };
});

vi.mock("@ui/core/common/webview.controller", () => {
  return {
    WebviewController: vi.fn(
      class {
        initialize = vi.fn().mockResolvedValue(undefined);
      },
    ),
  };
});

describe("UI entrypoint", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error");
    vi.resetModules();
  });

  it("should initialize container and controller correctly", async () => {
    await import("../index");
    expect(DIContainer).toHaveBeenCalledTimes(1);

    const diMock = vi.mocked(DIContainer).mock.results[0].value as Mocked<DIContainer>;
    expect(diMock.init).toHaveBeenCalledTimes(1);

    expect(WebviewController).toHaveBeenCalledTimes(1);
    expect((WebviewController as any).mock.results[0].value.initialize).toHaveBeenCalledTimes(1);
  });

  it("should catch errors during initialization", async () => {
    (DIContainer as Mock).mockImplementationOnce(() => {
      return {
        init: vi.fn().mockRejectedValue(new Error("fail")),
        previewManager: {},
        optionListManager: {},
        keyboardHandler: {},
      };
    });

    await import("../index");

    expect(consoleErrorSpy).toHaveBeenCalledWith("[Index] Fatal error during initialization:", expect.any(Error));
  });
});
