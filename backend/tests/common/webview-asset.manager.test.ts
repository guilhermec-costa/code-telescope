import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { IFuzzyFinderProvider } from "../../core/abstractions/fuzzy-finder.provider";
import { ExtensionConfigManager } from "../../core/common/config-manager";
import { CustomProviderStorage } from "../../core/common/custom/custom-provider.storage";
import { WebviewAssetManager } from "../../core/common/webview-asset.manager";

vi.mock("../../globals", () => ({
  Globals: {
    EXTENSION_URI: { fsPath: "/mock/extension/path" },
    CUSTOM_PROVIDER_PREFIX: "custom.",
  },
}));

vi.mock("../../utils/files", () => ({
  joinPath: vi.fn((uri, ...parts) => ({
    fsPath: `${uri.fsPath}/${parts.join("/")}`,
    toString: () => `${uri.fsPath}/${parts.join("/")}`,
  })),
}));

vi.mock("../../core/common/config-manager", () => ({
  ExtensionConfigManager: {
    previewManagerCfg: { scrollBehavior: "smooth" },
    wsFileFinderCfg: { textDisplay: "relative" },
    keybindings: { moveDown: "ctrl+j" },
    layoutCfg: {
      leftSideWidthPct: 50,
      rightSideWidthPct: 50,
      panelContainerPct: 90,
      promptFontSize: 14,
      resultsFontSize: 13,
      previewFontSize: 12,
      borderSizeInPx: 1,
      borderRadiusInPx: 4,
      mode: "classic",
    },
  },
}));

vi.mock("../../core/common/custom/custom-provider.storage", () => ({
  CustomProviderStorage: {
    instance: {
      getUiProxyDefinition: vi.fn(),
    },
  },
}));

describe("WebviewAssetManager", () => {
  let mockWebview: vscode.Webview;
  let mockProvider: IFuzzyFinderProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWebview = {
      asWebviewUri: vi.fn((uri) => {
        const path = typeof uri === "string" ? uri : uri.fsPath;
        return { toString: () => `webview-uri://${path}` } as any;
      }),
    } as unknown as vscode.Webview;

    mockProvider = {
      fuzzyAdapterType: "workspace.files",
      customPlaceholders: vi.fn(() => ({})),
    } as unknown as IFuzzyFinderProvider;
  });

  it("should select the correct layout file based on config mode", async () => {
    const rawHtml = "<html>{{style}}</html>";
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(rawHtml) as any);

    ExtensionConfigManager.layoutCfg.mode = "ivy";

    await WebviewAssetManager.getProcessedHtml(mockWebview, mockProvider);

    expect(vscode.workspace.fs.readFile).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: expect.stringContaining("ivy.view.html") }),
    );
  });

  it("should inject all dynamic CSS variables into <cssvariables>", async () => {
    const rawHtml = "<cssvariables></cssvariables>";
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(rawHtml) as any);

    const result = await WebviewAssetManager.getProcessedHtml(mockWebview, mockProvider);

    expect(result).toContain("<style>:root {");
    expect(result).toContain("--left-pane-width: 50%");
    expect(result).toContain("--prompt-font-size: 14px");
    expect(result).toContain("--border-radius: 4px");
  });

  it("should allow provider to override layout filenames via customPlaceholders", async () => {
    const rawHtml = "Content";
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(rawHtml) as any);

    mockProvider.customPlaceholders = vi.fn(() => ({
      layoutHtmlFilename: "special.view.html",
      layoutCssFilename: "special.css",
    }));

    await WebviewAssetManager.getProcessedHtml(mockWebview, mockProvider);

    expect(vscode.workspace.fs.readFile).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: expect.stringContaining("special.view.html") }),
    );
    expect(mockWebview.asWebviewUri).toHaveBeenCalledWith(
      expect.objectContaining({ fsPath: expect.stringContaining("ui/style/special.css") }),
    );
  });

  it("should correctly inject custom UI data for custom providers", async () => {
    mockProvider.fuzzyAdapterType = "custom.my-finder";
    const rawHtml = "<div>{{__CUSTOM_DATA_ADAPTER__}}</div>";
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(rawHtml) as any);

    const mockPayload = { some: "data" };
    vi.mocked(CustomProviderStorage.instance.getUiProxyDefinition).mockReturnValue({
      ok: true,
      value: { toSerializableObject: () => mockPayload },
    } as any);

    const result = await WebviewAssetManager.getProcessedHtml(mockWebview, mockProvider);

    expect(result).toContain(JSON.stringify(mockPayload, null, 2));
    expect(CustomProviderStorage.instance.getUiProxyDefinition).toHaveBeenCalledWith("custom.my-finder");
  });

  it("should inject global state like keybindings and shiki URI", async () => {
    const rawHtml = "SHIKI: {{__SHIKI_URI__}}, KEYS: {{__KEYBINDINGS_CFG__}}";
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(rawHtml) as any);

    const result = await WebviewAssetManager.getProcessedHtml(mockWebview, mockProvider);

    expect(result).toContain("webview-uri://");
    expect(result).toContain("shiki");
    expect(result).toContain("ctrl+j");
  });
});
