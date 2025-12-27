import { beforeEach, describe, expect, it, type Mocked, vi } from "vitest";
import * as vscode from "vscode";
import { CustomProviderLoader } from "../core/common/custom/custom-provider.loader";
import { loadFuzzyProviders } from "../core/finders/loader";
import { FuzzyFinderPanelController } from "../core/presentation/fuzzy-panel.controller";
import { loadWebviewHandlers } from "../core/presentation/handlers/loader";
import { activate, deactivate } from "../extension";
import { Globals } from "../globals";
import { registerAndSubscribeCmd } from "../utils/commands";

vi.mock("@backend/core/finders/loader", () => ({
  loadFuzzyProviders: vi.fn(),
}));

vi.mock("@backend/core/common/custom/custom-provider.loader", () => {
  return {
    CustomProviderLoader: vi.fn(
      class {
        initialize = vi.fn().mockResolvedValue(undefined);
        dispose = vi.fn();
      },
    ),
  };
});

vi.mock("@backend/core/presentation/handlers/loader", () => ({
  loadWebviewHandlers: vi.fn(),
}));

vi.mock("@backend/utils/commands", () => ({
  getCmdId: vi.fn((...args: string[]) => args.join(".")),
  registerAndSubscribeCmd: vi.fn(),
}));

vi.mock("@backend/utils/configuration", () => ({
  getConfigurationSection: vi.fn(() => "Dark+"),
}));

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    createOrShow: vi.fn(() => ({
      startProvider: vi.fn(),
    })),
  },
}));

vi.mock("@backend/core/common/custom-provider-manager", () => ({
  CustomProviderManager: {
    instance: {
      getBackendProxyDefinition: vi.fn(),
      getUiProxyDefinition: vi.fn(),
      registerConfig: vi.fn(),
    },
  },
}));

vi.mock("@backend/globals", () => ({
  Globals: {
    EXTENSION_NAME: "CodeTelescope",
    EXTENSION_URI: null,
    USER_THEME: "",
    cfgSections: { colorTheme: "colorTheme" },
  },
}));

export function mockCustomProvider(path: string, def: any) {
  vi.doMock(path, () => def);
}

describe("Extension entrypoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should activate the extension correctly", async () => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([]);
    const context = { extensionUri: "uri" } as any;

    await activate(context);

    expect(Globals.EXTENSION_URI).toBe("uri");
    expect(Globals.USER_THEME).toBe("Dark+");

    // annotation loaders
    expect(loadFuzzyProviders).toHaveBeenCalled();
    expect(loadWebviewHandlers).toHaveBeenCalled();

    // registered commands
    const expectedCommands = [
      ["fuzzy.file", expect.any(Function), context],
      ["fuzzy.branch", expect.any(Function), context],
      ["fuzzy.wsText", expect.any(Function), context],
      ["fuzzy.commits", expect.any(Function), context],
      ["fuzzy.custom", expect.any(Function), context],
    ];

    expectedCommands.forEach(([cmdId, callback, ctx], index) => {
      expect(registerAndSubscribeCmd).toHaveBeenNthCalledWith(index + 1, cmdId, callback, ctx);
    });
    expect(registerAndSubscribeCmd).toHaveBeenCalledTimes(expectedCommands.length);

    const providerInstance = FuzzyFinderPanelController.createOrShow();
    const loaderInstance = vi.mocked(CustomProviderLoader).mock.results[0].value as Mocked<CustomProviderLoader>;

    expect(providerInstance.startProvider).not.toHaveBeenCalled();
    expect(loaderInstance.initialize).toHaveBeenCalledOnce();
  });

  it("should log deactivate message", () => {
    const consoleSpy = vi.spyOn(console, "log");
    deactivate();
    expect(consoleSpy).toHaveBeenCalledWith("code-telescope deactivated");
    consoleSpy.mockRestore();
  });
});
