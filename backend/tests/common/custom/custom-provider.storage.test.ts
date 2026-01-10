import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { CustomProviderStorage } from "../../../core/common/custom/custom-provider.storage";
import { CustomFinderBackendProxy } from "../../../core/finders/custom/backend-proxy.finder";
import { CustomFinderUiProxy } from "../../../core/finders/custom/ui-proxy.finder";

describe("CustomProviderManager", () => {
  const mockConfig: CustomFinderDefinition = {
    fuzzyAdapterType: "custom.test",
    backend: {
      querySelectableOptions: vi.fn(),
      onSelect: vi.fn(),
      getPreviewData: vi.fn(),
    },
    ui: {
      dataAdapter: {
        parseOptions: vi.fn(),
        getDisplayText: vi.fn(),
        getSelectionValue: vi.fn(),
      },
    },
  };

  beforeEach(() => {
    (CustomProviderStorage as any)._instance = undefined;
    vi.restoreAllMocks();
  });

  it("should register and retrieve a config", () => {
    const manager = CustomProviderStorage.instance;

    manager.registerConfig(mockConfig);

    const result = manager.getConfig("custom.test");

    expect(result).toBe(mockConfig);
  });

  it("should delete a registered config", () => {
    const manager = CustomProviderStorage.instance;

    manager.registerConfig(mockConfig);
    manager.deleteConfig("custom.test");

    expect(manager.getConfig("custom.test")).toBeUndefined();
  });

  it("should return all registered types", () => {
    const manager = CustomProviderStorage.instance;

    manager.registerConfig(mockConfig);

    expect(manager.getAllTypes()).toEqual(["custom.test"]);
  });

  it("should fail to create backend proxy if config does not exist", () => {
    const manager = CustomProviderStorage.instance;

    const result = manager.getBackendProxyDefinition("unknown.type");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Custom finder configuration not found");
    }
  });

  it("should fail to create ui proxy if config does not exist", () => {
    const manager = CustomProviderStorage.instance;

    const result = manager.getUiProxyDefinition("unknown.type");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Custom finder configuration not found");
    }
  });

  it("should create backend proxy when config exists", () => {
    const backendProxy = { execute: vi.fn() } as any;

    vi.spyOn(CustomFinderBackendProxy, "create").mockReturnValue({
      ok: true,
      value: backendProxy,
    });

    const manager = CustomProviderStorage.instance;
    manager.registerConfig(mockConfig);

    const result = manager.getBackendProxyDefinition("custom.test");

    expect(CustomFinderBackendProxy.create).toHaveBeenCalledWith(mockConfig);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(backendProxy);
    }
  });

  it("should propagate backend proxy creation error", () => {
    vi.spyOn(CustomFinderBackendProxy, "create").mockReturnValue({
      ok: false,
      error: "backend error",
    });

    const manager = CustomProviderStorage.instance;
    manager.registerConfig(mockConfig);

    const result = manager.getBackendProxyDefinition("custom.test");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("backend error");
    }
  });

  it("should create ui proxy when config exists", () => {
    const uiProxy = { render: vi.fn() } as any;

    vi.spyOn(CustomFinderUiProxy, "create").mockReturnValue({
      ok: true,
      value: uiProxy,
    });

    const manager = CustomProviderStorage.instance;
    manager.registerConfig(mockConfig);

    const result = manager.getUiProxyDefinition("custom.test");

    expect(CustomFinderUiProxy.create).toHaveBeenCalledWith(mockConfig);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(uiProxy);
    }
  });

  it("should propagate ui proxy creation error", () => {
    vi.spyOn(CustomFinderUiProxy, "create").mockReturnValue({
      ok: false,
      error: "ui error",
    });

    const manager = CustomProviderStorage.instance;
    manager.registerConfig(mockConfig);

    const result = manager.getUiProxyDefinition("custom.test");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("ui error");
    }
  });
});
