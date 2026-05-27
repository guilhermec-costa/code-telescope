import { beforeEach, describe, expect, it, type Mocked, vi } from "vitest";
import { CustomProviderLoader } from "../core/common/custom/custom-provider.loader";
import { activate, deactivate } from "../extension";
import { Globals } from "../globals";
import { registerFuzzyFinder } from "../utils/commands";

vi.mock("../core/decorators/loader", () => ({
  loadDecorators: vi.fn().mockResolvedValue(undefined),
}));

const telemetryMock = vi.hoisted(() => ({
  track: vi.fn(),
  trackFinderInvoked: vi.fn(),
  dispose: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../telemetry", () => ({
  TelemetryService: {
    instance: telemetryMock,
  },
}));

vi.mock("@backend/harpoon", () => ({
  registerHarpoonCmds: vi.fn(),
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
  registerFuzzyFinder: vi.fn(),
  registerFuzzyCmd: vi.fn(),
  registerHarpoonCmd: vi.fn(),
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

    // provider loader
    const loaderInstance = vi.mocked(CustomProviderLoader).mock.results[0].value as Mocked<CustomProviderLoader>;
    expect(loaderInstance.initialize).toHaveBeenCalledOnce();

    // commands
    const expectedCommands = [
      "file",
      "keybindings",
      "branch",
      "diff",
      "stash",
      "wsText",
      "fileText",
      "wsSymbols",
      "recentFiles",
      "colorschemes",
      "diagnostics",
      "callHierarchy",
      "tasks",
      "custom",
      "harpoon",
      "breakpoints",
      "documentSymbols",
      "commit",
      "extensions",
      "fontFamily",
      "pkgDocs",
      "lspRefs",
      "builtin",
      "resume",
    ];

    expectedCommands.forEach((cmd) => {
      expect(registerFuzzyFinder).toHaveBeenCalledWith(cmd, expect.any(Function), context);
    });

    expect(registerFuzzyFinder).toHaveBeenCalledTimes(expectedCommands.length);
  });

  it("should dispose resources on deactivate", async () => {
    await activate({
      extensionUri: "uri",
      subscriptions: [],
    } as any);

    const loaderInstance = vi.mocked(CustomProviderLoader).mock.results[0].value as Mocked<CustomProviderLoader>;

    const consoleSpy = vi.spyOn(console, "log");

    await deactivate();

    expect(loaderInstance.dispose).toHaveBeenCalledOnce();

    expect(telemetryMock.dispose).toHaveBeenCalledOnce();

    expect(consoleSpy).toHaveBeenCalledWith("code-telescope deactivated");

    consoleSpy.mockRestore();
  });
});
