import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { CustomProviderManager } from "../core/common/custom-provider-manager";
import { loadFuzzyProviders } from "../core/finders/loader";
import { FuzzyFinderPanelController } from "../core/presentation/fuzzy-panel.controller";
import { loadWebviewHandlers } from "../core/presentation/handlers/loader";
import { FuzzyFinderAdapterRegistry } from "../core/registry/fuzzy-provider.registry";
import { activate, deactivate, setupCustomProviders } from "../extension";
import { Globals } from "../globals";
import { getCmdId, registerAndSubscribeCmd } from "../utils/commands";

vi.mock("@backend/core/finders/loader", () => ({
  loadFuzzyProviders: vi.fn(),
}));

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
  const customModules = [
    {
      fsPath: "/fake/providers/git-branch.js",
      module: {
        default: {
          fuzzyAdapterType: "git.branch",
          backend: { querySelectableOptions: vi.fn() },
        },
      },
    },
    {
      fsPath: "/fake/providers/ws-text.js",
      module: {
        default: {
          fuzzyAdapterType: "ws.text",
          backend: { querySelectableOptions: vi.fn() },
        },
      },
    },
  ];

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
    expect(providerInstance.startProvider).not.toHaveBeenCalled();
  });

  it("should load and register custom providers", async () => {
    const mockedContext = { extensionUri: "uri" } as any;
    vi.mocked(vscode.workspace.findFiles).mockResolvedValue([
      { fsPath: customModules[0].fsPath } as any,
      { fsPath: customModules[1].fsPath } as any,
    ]);

    vi.doMock("/fake/providers/git-branch.js", () => customModules[0].module);
    vi.doMock("/fake/providers/ws-text.js", () => customModules[1].module);

    const backendProxy = { fn: () => {} } as any;
    const uiProxy = { render: () => {} } as any;
    vi.mocked(CustomProviderManager.instance.getBackendProxyDefinition)
      .mockReturnValueOnce({ ok: false, error: "failed to create provider" })
      .mockReturnValueOnce({ ok: true, value: backendProxy });

    vi.mocked(CustomProviderManager.instance.getUiProxyDefinition).mockReturnValueOnce({ ok: true, value: uiProxy });

    const adapterRegistrySpy = vi.spyOn(FuzzyFinderAdapterRegistry.instance, "register");

    await setupCustomProviders(mockedContext);

    const manager = CustomProviderManager.instance;

    expect(manager.registerConfig).toHaveBeenCalledWith(customModules[0].module.default);
    expect(manager.registerConfig).toHaveBeenCalledWith(customModules[1].module.default);
    expect(manager.getBackendProxyDefinition).toHaveBeenCalledWith(customModules[0].module.default.fuzzyAdapterType);
    expect(manager.getBackendProxyDefinition).toHaveBeenCalledWith(customModules[1].module.default.fuzzyAdapterType);
    expect(registerAndSubscribeCmd).toHaveBeenNthCalledWith(
      1,
      getCmdId("fuzzy", customModules[1].module.default.fuzzyAdapterType),
      expect.any(Function),
      mockedContext,
    );

    expect(adapterRegistrySpy).toHaveBeenCalledTimes(1);
    expect(FuzzyFinderAdapterRegistry.instance.register).toHaveBeenCalledWith(backendProxy);
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining("failed to create provider"));
  });

  it("should fail if backend UI proxy cannot be created", async () => {
    vi.mocked(CustomProviderManager.instance.getBackendProxyDefinition).mockReturnValueOnce({
      ok: false,
      error: "backend error",
    });

    await setupCustomProviders({ extensionUri: "uri" } as any);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining("backend error"));
  });

  it("should fail if UI proxy cannot be created", async () => {
    vi.mocked(CustomProviderManager.instance.getBackendProxyDefinition).mockReturnValueOnce({
      ok: true,
      value: {} as any,
    });

    vi.mocked(CustomProviderManager.instance.getUiProxyDefinition).mockReturnValueOnce({
      ok: false,
      error: "ui error",
    });

    await setupCustomProviders({ extensionUri: "uri" } as any);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining("ui error"));
  });

  it("should log deactivate message", () => {
    const consoleSpy = vi.spyOn(console, "log");
    deactivate();
    expect(consoleSpy).toHaveBeenCalledWith("code-telescope deactivated");
    consoleSpy.mockRestore();
  });
});
