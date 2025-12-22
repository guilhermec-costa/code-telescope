import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { FileContentCache } from "../../core/common/cache/file-content.cache";
import { HighlightContentCache } from "../../core/common/cache/highlight-content.cache";
import { WorkspaceFileFinder } from "../../core/finders/ws-files.finder";
import { execCmd } from "../../utils/commands";

vi.mock("@backend/utils/commands", () => ({
  execCmd: vi.fn(),
}));

vi.mock("@backend/utils/files", () => ({
  getLanguageFromPath: vi.fn(() => "ts"),
}));

vi.mock("@backend/core/common/cache/file-content.cache", () => ({
  FileContentCache: {
    instance: {
      get: vi.fn(),
    },
  },
}));

vi.mock("@backend/core/common/cache/highlight-content.cache", () => ({
  HighlightContentCache: {
    instance: {
      get: vi.fn(),
    },
  },
}));

vi.mock("@backend/core/common/config-manager", () => ({
  ExtensionConfigManager: {
    wsFileFinderCfg: {
      excludePatterns: ["node_modules"],
      excludeHidden: true,
      includePatterns: ["**/*"],
      maxResults: 100,
    },
  },
}));

describe("WorkspaceFileFinder", () => {
  let provider: WorkspaceFileFinder;

  beforeEach(() => {
    provider = new WorkspaceFileFinder();
    vi.clearAllMocks();
  });

  it("returns html load config", () => {
    const cfg = provider.getHtmlLoadConfig();

    expect(cfg.fileName).toBe("file-fuzzy.view.html");
    expect(cfg.placeholders["{{style}}"]).toBe("ui/style/style.css");
  });

  it("returns absolute and relative file paths", async () => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([{ path: "/abs/a.ts" }, { path: "/abs/b.ts" }] as any);

    vi.mocked(vscode.workspace.fs.stat)
      .mockResolvedValueOnce({ size: 1 } as any)
      .mockResolvedValueOnce({ size: 1 } as any);

    vi.mocked(vscode.workspace.asRelativePath).mockImplementation((p: any) => `rel/${p}`);

    const result = await provider.querySelectableOptions();

    expect(result.abs).toEqual(["/abs/a.ts", "/abs/b.ts"]);
    expect(result.relative).toEqual(["rel//abs/a.ts", "rel//abs/b.ts"]);
  });

  it("opens selected file", async () => {
    await provider.onSelect("/abs/file.ts");

    expect(execCmd).toHaveBeenCalled();
  });

  it("returns cached highlighted content when available", async () => {
    vi.mocked(HighlightContentCache.instance.get).mockReturnValueOnce("cached code");

    const result = await provider.getPreviewData("/abs/file.ts");

    expect(result.content.isCached).toBe(true);
    expect(result.content.text).toBe("cached code");
  });

  it("loads file content when not cached", async () => {
    vi.mocked(HighlightContentCache.instance.get).mockReturnValueOnce(undefined);

    vi.mocked(FileContentCache.instance.get).mockResolvedValueOnce("file content");

    const result = await provider.getPreviewData("/abs/file.ts");

    expect(result.content.isCached).toBe(false);
    expect(result.content.text).toBe("file content");
  });
});
