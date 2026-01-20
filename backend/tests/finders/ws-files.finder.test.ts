import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { FileContentCache } from "../../core/common/cache/file-content.cache";
import { WorkspaceFileFinder } from "../../core/finders/ws-files.finder";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";

vi.mock("../../utils/commands", () => ({
  execCmd: vi.fn(),
}));

vi.mock("../../utils/files", () => ({
  getLanguageFromPath: vi.fn(() => "ts"),
  getSvgIconUrl: vi.fn(() => "file-icon"),
  resolvePathExt: vi.fn(() => "ts"),
}));

vi.mock("../../core/common/cache/file-content.cache", () => ({
  FileContentCache: {
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
      maxFileSize: 1024,
    },
  },
}));

vi.mock("../../core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: null,
  },
}));

vi.mock("../../core/presentation/webview.controller", () => ({
  WebviewController: {
    sendMessage: vi.fn(),
  },
}));

vi.mock("fast-glob", () => ({
  default: vi.fn(() => Promise.resolve([])),
}));

describe("WorkspaceFileFinder", () => {
  let provider: WorkspaceFileFinder;

  beforeEach(() => {
    vi.mocked(vscode.workspace.asRelativePath).mockImplementation((p: any) => `rel/${p}`);
    provider = new WorkspaceFileFinder();
    vi.clearAllMocks();
  });

  it("returns absolute and relative file paths", async () => {
    const fg = await import("fast-glob");
    vi.mocked(fg.default).mockResolvedValueOnce(["/abs/a.ts", "/abs/b.ts"] as any);

    const result = await provider.querySelectableOptions();

    expect(result.abs).toEqual(["/abs/a.ts", "/abs/b.ts"]);
    expect(result.relative).toEqual(["rel//abs/a.ts", "rel//abs/b.ts"]);
  });

  it("opens selected file", async () => {
    await provider.onSelect("/abs/file.ts");

    expect(execCmd).toHaveBeenCalledWith(Globals.cmds.openFile, expect.objectContaining({ fsPath: "/abs/file.ts" }));
  });

  it("loads file content when not cached - text file", async () => {
    vi.mocked(FileContentCache.instance.get).mockResolvedValueOnce("file content");

    const result: any = await provider.getPreviewData("/abs/file.ts");

    expect(result.content.kind).toBe("text");
    expect(result.content.text).toBe("file content");
    expect(result.language).toBe("ts");
  });

  it("loads image file content", async () => {
    const { resolvePathExt } = await import("../../utils/files");
    vi.mocked(resolvePathExt).mockReturnValueOnce("png");

    const mockBuffer = new Uint8Array([1, 2, 3]);
    vi.mocked(FileContentCache.instance.get).mockResolvedValueOnce(mockBuffer);

    const result: any = await provider.getPreviewData("/abs/image.png");

    expect(result.content.kind).toBe("image");
    expect(result.content.buffer).toBe(mockBuffer);
    expect(result.content.mimeType).toBe("image/png");
    expect(result.overridePreviewer).toBe("preview.image");
  });

  it("processes file chunks correctly", async () => {
    const fg = await import("fast-glob");
    const files = Array.from({ length: 10 }, (_, i) => `/abs/file${i}.ts`);
    vi.mocked(fg.default).mockResolvedValueOnce(files as any);

    const result = await provider.querySelectableOptions();

    expect(result.abs).toHaveLength(10);
    expect(result.relative).toHaveLength(10);
    expect(result.svgIconUrl).toHaveLength(10);
  });

  it("returns empty array when no workspace folders", async () => {
    vi.spyOn(vscode.workspace, "workspaceFolders", "get").mockReturnValue(undefined);

    const result = await provider.getWorkspaceFiles();

    expect(result).toEqual([]);
  });
});
