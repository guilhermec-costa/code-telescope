import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { CustomProviderLoader } from "../../../core/common/custom/custom-provider.loader";
import { CustomProviderStorage } from "../../../core/common/custom/custom-provider.storage";
import { FuzzyFinderAdapterRegistry } from "../../../core/registry/fuzzy-provider.registry";
import { registerAndSubscribeCmd } from "../../../utils/commands";

vi.mock("@backend/utils/commands", () => ({
  registerAndSubscribeCmd: vi.fn(),
  getCmdId: vi.fn(() => "fuzzy.test"),
}));

vi.mock("@backend/core/common/custom/custom-provider.storage", () => ({
  CustomProviderStorage: {
    instance: {
      registerConfig: vi.fn(),
      deleteConfig: vi.fn(),
      getBackendProxyDefinition: vi.fn(),
      getUiProxyDefinition: vi.fn(),
    },
  },
}));

vi.mock("@backend/core/registry/fuzzy-provider.registry", () => ({
  FuzzyFinderAdapterRegistry: {
    instance: {
      register: vi.fn(),
      deleteAdapter: vi.fn(),
    },
  },
}));

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    createOrShow: vi.fn(() => ({
      startProvider: vi.fn(),
    })),
  },
}));

describe("CustomProviderLoader", () => {
  const fakeUri = { fsPath: "/fake/provider.finder.cjs" } as vscode.Uri;

  const fakeContext = {
    subscriptions: [],
  } as any;

  const fakeConfig = {
    fuzzyAdapterType: "custom.test",
    previewAdapterType: "preview.test",
    backend: {},
    ui: { dataAdapter: {} },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load and register providers on initialize", async () => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValue([fakeUri]);

    vi.doMock("/fake/provider.finder.cjs", () => ({
      default: fakeConfig,
    }));

    vi.mocked(CustomProviderStorage.instance.getBackendProxyDefinition).mockReturnValue({
      ok: true,
      value: { fuzzyAdapterType: "custom.test" } as any,
    });

    vi.mocked(CustomProviderStorage.instance.getUiProxyDefinition).mockReturnValue({
      ok: true,
      value: {} as any,
    });

    const watcher = {
      onDidCreate: vi.fn(),
      onDidChange: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    };

    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(watcher as any);

    const loader = new CustomProviderLoader(fakeContext);
    await loader.initialize();

    expect(CustomProviderStorage.instance.registerConfig).toHaveBeenCalledWith(fakeConfig);
    expect(FuzzyFinderAdapterRegistry.instance.register).toHaveBeenCalled();
    expect(registerAndSubscribeCmd).toHaveBeenCalled();
    expect(fakeContext.subscriptions).toContain(watcher);
  });

  it("should show error if backend proxy creation fails", async () => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValue([fakeUri]);

    vi.doMock("/fake/provider.finder.cjs", () => ({
      default: fakeConfig,
    }));

    vi.mocked(CustomProviderStorage.instance.getBackendProxyDefinition).mockReturnValue({
      ok: false,
      error: "backend error",
    });

    const loader = new CustomProviderLoader(fakeContext);
    await loader.initialize();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining("backend error"));
  });

  it("should show error if ui proxy creation fails", async () => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValue([fakeUri]);

    vi.doMock("/fake/provider.finder.cjs", () => ({
      default: fakeConfig,
    }));

    vi.mocked(CustomProviderStorage.instance.getBackendProxyDefinition).mockReturnValue({
      ok: true,
      value: { fuzzyAdapterType: "custom.test" } as any,
    });

    vi.mocked(CustomProviderStorage.instance.getUiProxyDefinition).mockReturnValue({
      ok: false,
      error: "ui error",
    });

    const loader = new CustomProviderLoader(fakeContext);
    await loader.initialize();

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining("ui error"));
  });

  it("should cleanup on delete event", async () => {
    const loader = new CustomProviderLoader(fakeContext);

    // força estado interno
    (loader as any).loadedProviders.set("/fake/provider.finder.cjs", "custom.test");

    (loader as any).onDelete({ fsPath: "/fake/provider.finder.cjs" });

    expect(CustomProviderStorage.instance.deleteConfig).toHaveBeenCalledWith("custom.test");
    expect(FuzzyFinderAdapterRegistry.instance.deleteAdapter).toHaveBeenCalledWith("custom.test");
  });

  it("should dispose watcher and clear providers", () => {
    const loader = new CustomProviderLoader(fakeContext);

    const watcher = { dispose: vi.fn() };
    (loader as any).watcher = watcher;
    (loader as any).loadedProviders.set("a", "b");

    loader.dispose();

    expect(watcher.dispose).toHaveBeenCalled();
    expect((loader as any).loadedProviders.size).toBe(0);
  });
});
