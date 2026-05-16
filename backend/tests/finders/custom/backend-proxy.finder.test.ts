import { CustomFinderBackendProxy } from "@backend/core/finders/custom/backend-proxy.finder";
import { CustomFinderDefinition } from "@shared/custom-provider";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";

describe("CustomFinderBackendProxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks unsafe URL schemes from custom providers", async () => {
    const def: CustomFinderDefinition = {
      fuzzyAdapterType: "custom.test",
      backend: {
        querySelectableOptions: async () => [],
        onSelect: async () => ({ action: "openUrl", url: "file:///etc/passwd" }),
        getPreviewData: async () => ({ content: "", kind: "text", language: "plaintext" }) as any,
      },
      ui: {
        dataAdapter: {
          parseOptions: () => [],
          getSelectionValue: () => "",
          getSearchText: () => "",
          getHtmlWrapper: () => "",
        },
      },
    };

    const result = CustomFinderBackendProxy.create(def);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);

    await result.value.onSelect("any");

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Blocked unsafe URL: file:///etc/passwd");
    expect(vscode.env.openExternal).not.toHaveBeenCalled();
  });

  it("allows https URLs from custom providers", async () => {
    const def: CustomFinderDefinition = {
      fuzzyAdapterType: "custom.test",
      backend: {
        querySelectableOptions: async () => [],
        onSelect: async () => ({ action: "openUrl", url: "https://example.com" }),
        getPreviewData: async () => ({ content: "", kind: "text", language: "plaintext" }) as any,
      },
      ui: {
        dataAdapter: {
          parseOptions: () => [],
          getSelectionValue: () => "",
          getSearchText: () => "",
          getHtmlWrapper: () => "",
        },
      },
    };

    const result = CustomFinderBackendProxy.create(def);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);

    await result.value.onSelect("any");

    expect(vscode.env.openExternal).toHaveBeenCalled();
  });
});
