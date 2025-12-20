import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileContentCache } from "../../core/common/cache/file-content.cache";
import { HighlightContentCache } from "../../core/common/cache/highlight-content.cache";
import { WorkspaceFileFinder } from "../../core/finders/ws-files.finder";
import { execCmd } from "../../utils/commands";
import { findWorkspaceFiles } from "../../utils/files";

vi.mock("../../utils/commands", () => ({
  execCmd: vi.fn(),
}));

vi.mock("../../utils/files", () => ({
  findWorkspaceFiles: vi.fn(),
  relativizeFilePath: vi.fn((p: string) => `rel/${p}`),
  getLanguageFromPath: vi.fn(() => "ts"),
}));

vi.mock("../../core/common/cache/file-content.cache", () => ({
  FileContentCache: {
    instance: {
      get: vi.fn(),
    },
  },
}));

vi.mock("../../core/common/cache/highlight-content.cache", () => ({
  HighlightContentCache: {
    instance: {
      get: vi.fn(),
    },
  },
}));

vi.mock("../../core/common/config-manager", () => ({
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
    vi.mocked(findWorkspaceFiles).mockResolvedValueOnce([{ path: "/abs/a.ts" }, { path: "/abs/b.ts" }] as any);

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
