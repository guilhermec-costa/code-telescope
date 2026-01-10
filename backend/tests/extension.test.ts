import { beforeEach, describe, expect, it, type Mocked, vi } from "vitest";
import { CustomProviderLoader } from "../core/common/custom/custom-provider.loader";
import { loadDecorators } from "../core/decorators/loader";
import { activate, deactivate } from "../extension";
import { Globals } from "../globals";
import { registerProviderCmd } from "../utils/commands";

vi.mock("../core/decorators/loader", () => ({
  loadDecorators: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../core/common/custom/custom-provider.loader", () => {
  return {
    CustomProviderLoader: vi.fn(
      class {
        initialize = vi.fn().mockResolvedValue(undefined);
        dispose = vi.fn();
      },
    ),
  };
});

vi.mock("../utils/commands", () => ({
  registerProviderCmd: vi.fn(),
}));

vi.mock("../utils/configuration", () => ({
  getConfigurationSection: vi.fn(() => "Dark+"),
}));

vi.mock("../core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    setupProvider: vi.fn(),
  },
}));

vi.mock("../core/common/custom/custom-provider.storage", () => ({
  CustomProviderStorage: {
    instance: {
      getAllTypes: vi.fn(() => []),
    },
  },
}));

vi.mock("../core/registry/fuzzy-provider.registry", () => ({
  FuzzyFinderAdapterRegistry: {
    instance: {
      getAdapter: vi.fn(() => ({
        captureEditorContext: vi.fn(),
      })),
    },
  },
}));

vi.mock("../globals", () => ({
  Globals: {
    EXTENSION_NAME: "CodeTelescope",
    EXTENSION_URI: null,
    USER_THEME: "",
    cfgSections: { colorTheme: "colorTheme" },
  },
}));

describe("Extension entrypoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should activate the extension correctly", async () => {
    const context = { extensionUri: "uri" } as any;

    await activate(context);

    // globals
    expect(Globals.EXTENSION_URI).toBe("uri");
    expect(Globals.USER_THEME).toBe("Dark+");

    // decorators
    expect(loadDecorators).toHaveBeenNthCalledWith(1, "**/*.finder.js", expect.any(String));
    expect(loadDecorators).toHaveBeenNthCalledWith(2, "**/*.handler.js", expect.any(String));

    // provider loader
    const loaderInstance = vi.mocked(CustomProviderLoader).mock.results[0].value as Mocked<CustomProviderLoader>;
    expect(loaderInstance.initialize).toHaveBeenCalledOnce();

    // commands
    const expectedCommands = [
      "file",
      "keybindings",
      "branch",
      "wsText",
      "wsSymbols",
      "recentFiles",
      "colorschemes",
      "diagnostics",
      "callHierarchy",
      "custom",
    ];

    expectedCommands.forEach((cmd) => {
      expect(registerProviderCmd).toHaveBeenCalledWith(cmd, expect.any(Function), context);
    });

    expect(registerProviderCmd).toHaveBeenCalledTimes(expectedCommands.length);
  });

  it("should dispose provider loader on deactivate", () => {
    const loaderInstance = {
      dispose: vi.fn(),
    } as any;

    (global as any).customProviderLoader = loaderInstance;

    const consoleSpy = vi.spyOn(console, "log");

    deactivate();

    expect(consoleSpy).toHaveBeenCalledWith("code-telescope deactivated");

    consoleSpy.mockRestore();
  });
});
