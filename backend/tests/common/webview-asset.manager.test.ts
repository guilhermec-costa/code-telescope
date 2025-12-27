import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { IFuzzyFinderProvider } from "../../core/abstractions/fuzzy-finder.provider";
import { CustomProviderStorage } from "../../core/common/custom/custom-provider.storage";
import { WebviewAssetManager } from "../../core/common/webview-asset.manager";

vi.mock("@backend/globals", () => ({
  Globals: {
    EXTENSION_URI: { fsPath: "/mock/extension/path" },
    CUSTOM_PROVIDER_PREFIX: "custom.",
  },
}));

vi.mock("@backend/core/common/config-manager", () => {
  return {
    ExtensionConfigManager: class {
      static get previewManagerCfg() {
        return { scrollBehavior: "smooth" };
      }
      static get keybindings() {
        return { moveDown: "ctrl+j" };
      }
      static get uiPanelCfg() {
        return {
          leftSideWidthPct: 50,
          rightSideWidthPct: 50,
          panelContainerPct: 90,
        };
      }
    },
  };
});

describe("WebviewAssetManager", () => {
  let mockWebview: vscode.Webview;
  let mockProvider: IFuzzyFinderProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWebview = {
      asWebviewUri: vi.fn((uri) => `webview-uri://${uri.fsPath || "shiki"}`),
    } as unknown as vscode.Webview;

    mockProvider = {
      fuzzyAdapterType: "workspace.files",
      getHtmlLoadConfig: vi.fn(() => ({
        fileName: "index.html",
        placeholders: { "{{style}}": "ui/style.css" },
      })),
    } as unknown as IFuzzyFinderProvider;
  });

  it("should process HTML and replace all placeholders", async () => {
    const rawHtml = `
      <html>
        <cssvariables></cssvariables>
        <link rel="stylesheet" href="{{style}}">
        <script>
          const shiki = "{{__SHIKI_URI__}}";
          const cfg = {{__PREVIEW_CFG__}};
        </script>
      </html>
    `;

    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(rawHtml));

    const result = await WebviewAssetManager.getProcessedHtml(mockWebview, mockProvider);

    expect(result).toContain("<style>:root {");
    expect(result).toContain("--left-pane-width: 50%");

    expect(result).toContain("webview-uri://ui/style.css");

    expect(result).toContain("webview-uri://ui/dist/shiki");
    expect(result).toContain('"scrollBehavior":"smooth"');
  });

  it("should inject custom data adapter when provider is custom", async () => {
    mockProvider.fuzzyAdapterType = "custom.my-finder";
    const rawHtml = "<div>{{__CUSTOM_DATA_ADAPTER__}}</div>";

    const serializableUi = { parseOptions: "() => {}" };
    const spy = vi.spyOn(CustomProviderStorage.instance, "getUiProxyDefinition").mockReturnValue({
      ok: true,
      value: {
        toSerializableObject: () => serializableUi,
      },
    } as any);

    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(rawHtml));

    const result = await WebviewAssetManager.getProcessedHtml(mockWebview, mockProvider);

    expect(result).toContain('"parseOptions": "() => {}"');
    expect(spy).toHaveBeenCalledWith("custom.my-finder");
  });

  it("should handle multiple occurrences of the same placeholder", async () => {
    const rawHtml = "{{style}} | {{style}}";
    vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(Buffer.from(rawHtml));

    const result = await WebviewAssetManager.getProcessedHtml(mockWebview, mockProvider);

    const occurrences = result.match(/webview-uri:\/\/ui\/style\.css/g);
    expect(occurrences).toHaveLength(2);
  });
});
