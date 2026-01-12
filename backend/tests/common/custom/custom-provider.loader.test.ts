import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { CustomProviderLoader } from "../../../core/common/custom/custom-provider.loader";
import { CustomProviderStorage } from "../../../core/common/custom/custom-provider.storage";
import { FuzzyFinderAdapterRegistry } from "../../../core/registry/fuzzy-provider.registry";

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

vi.mock("url", () => ({
  pathToFileURL: vi.fn((path) => ({
    toString: () => `file://${path}`,
  })),
}));

vi.mock("@backend/globals", () => ({
  Globals: {
    EXTENSION_URI: { fsPath: "/extension-path" },
    CUSTOM_PROVIDER_PREFIX: "custom.",
  },
}));

vi.mock("@backend/core/log", () => {
  return {
    Logger: vi.fn(
      class {
        constructor() {}
      },
    ),
  };
});

describe("CustomProviderLoader", () => {
  const fakeUri = { fsPath: "/fake/provider.finder.cjs" } as vscode.Uri;
  const fakeContext = { subscriptions: [] } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(vscode.workspace.findFiles).mockResolvedValue([]);
    vi.mocked(vscode.workspace.fs.readDirectory).mockResolvedValue([]);

    const mockWatcher = {
      onDidCreate: vi.fn(),
      onDidChange: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    };
    vi.mocked(vscode.workspace.createFileSystemWatcher).mockReturnValue(mockWatcher as any);
  });

  it("should load workspace providers on initialize", async () => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValue([fakeUri]);

    vi.mocked(CustomProviderStorage.instance.registerConfig).mockReturnValue({ ok: true } as any);
    vi.mocked(CustomProviderStorage.instance.getBackendProxyDefinition).mockReturnValue({
      ok: true,
      value: { fuzzyAdapterType: "custom.test" } as any,
    });
    vi.mocked(CustomProviderStorage.instance.getUiProxyDefinition).mockReturnValue({
      ok: true,
      value: {} as any,
    });

    const loader = new CustomProviderLoader(fakeContext);

    const loadSpy = vi.spyOn(loader as any, "loadCustomProvider").mockImplementation(async () => {
      return {
        ok: true,
        value: { uri: fakeUri, fuzzyType: "custom.test" },
      };
    });

    await loader.initialize();
    expect(loadSpy).toHaveBeenCalled();
  });

  it("should handle deletion of a provider", async () => {
    const loader = new CustomProviderLoader(fakeContext);
    const fsPath = "/path/to/file.cjs";

    (loader as any).loadedProviders.set(fsPath, "custom.test");

    (loader as any).onDelete({ fsPath } as vscode.Uri);

    expect(CustomProviderStorage.instance.deleteConfig).toHaveBeenCalledWith("custom.test");
    expect(FuzzyFinderAdapterRegistry.instance.deleteAdapter).toHaveBeenCalledWith("custom.test");
    expect((loader as any).loadedProviders.has(fsPath)).toBe(false);
  });

  it("should dispose resources", () => {
    const loader = new CustomProviderLoader(fakeContext);
    const mockWatcher = { dispose: vi.fn() };
    (loader as any).watcher = mockWatcher;

    loader.dispose();

    expect(mockWatcher.dispose).toHaveBeenCalled();
    expect((loader as any).loadedProviders.size).toBe(0);
  });
});
