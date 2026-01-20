import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { FileContentCache } from "../../core/common/cache/file-content.cache";
import { WorkspaceFileFinder } from "../../core/finders/ws-files.finder";
import { FuzzyFinderPanelController } from "../../core/presentation/fuzzy-panel.controller";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";

vi.mock("../../utils/commands", () => ({
  execCmd: vi.fn(),
}));

vi.mock("../../utils/files", () => ({
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

vi.mock("../../core/presentation/webview.controller", () => ({
  WebviewController: {
    sendMessage: vi.fn(),
  },
}));

vi.mock("fast-glob", () => ({
  default: vi.fn(),
}));

describe("WorkspaceFileFinder (fast-glob + size)", () => {
  let provider: WorkspaceFileFinder;

  beforeEach(() => {
    provider = new WorkspaceFileFinder();

    vi.spyOn(vscode.workspace, "asRelativePath").mockImplementation((p: any) => `rel/${p}`);

    vi.spyOn(vscode.workspace, "workspaceFolders", "get").mockReturnValue([{ uri: vscode.Uri.file("/root") } as any]);

    vi.clearAllMocks();
  });

  it("returns first chunk with abs, relative and icons", async () => {
    const fg = await import("fast-glob");

    vi.mocked(fg.default).mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, i) => ({
        path: `/abs/file${i}.ts`,
        stats: { size: 100 },
      })) as any,
    );

    const result = await provider.querySelectableOptions();

    expect(result.abs).toHaveLength(10);
    expect(result.relative[0]).toBe("rel//abs/file0.ts");
    expect(result.svgIconUrl).toHaveLength(10);
  });

  it("filters files larger than maxFileSize", async () => {
    const fg = await import("fast-glob");

    vi.mocked(fg.default).mockResolvedValueOnce([
      { path: "/abs/small.ts", stats: { size: 100 } },
      { path: "/abs/large.ts", stats: { size: 1024 * 2000 } },
    ] as any);

    const files = await provider.getWorkspaceFilesWSize();

    expect(files).toEqual(["/abs/small.ts"]);
  });

  it("streams chunks when file count exceeds chunk size", async () => {
    const fg = await import("fast-glob");

    vi.mocked(fg.default).mockResolvedValueOnce(
      Array.from({ length: 3000 }, (_, i) => ({
        path: `/abs/file${i}.ts`,
        stats: { size: 100 },
      })) as any,
    );

    vi.spyOn(FuzzyFinderPanelController, "instance", "get").mockReturnValue({
      webview: {},
    } as any);

    const result = await provider.querySelectableOptions();

    expect(result.abs).toHaveLength(100);

    await new Promise((r) => setTimeout(r, 50));
  });

  it("opens selected file", async () => {
    await provider.onSelect("/abs/file.ts");

    expect(execCmd).toHaveBeenCalledWith(Globals.cmds.openFile, expect.objectContaining({ fsPath: "/abs/file.ts" }));
  });

  it("loads text preview", async () => {
    vi.mocked(FileContentCache.instance.get).mockResolvedValueOnce("content");

    const result: any = await provider.getPreviewData("/abs/file.ts");

    expect(result.content.kind).toBe("text");
    expect(result.content.text).toBe("content");
  });

  it("loads image preview", async () => {
    const { resolvePathExt } = await import("../../utils/files");
    vi.mocked(resolvePathExt).mockReturnValueOnce("png");

    const buffer = new Uint8Array([1, 2]);
    vi.mocked(FileContentCache.instance.get).mockResolvedValueOnce(buffer);

    const result: any = await provider.getPreviewData("/abs/image.png");

    expect(result.content.kind).toBe("image");
    expect(result.overridePreviewer).toBe("preview.image");
  });

  it("returns empty array when no workspace folders", async () => {
    vi.spyOn(vscode.workspace, "workspaceFolders", "get").mockReturnValue(undefined);

    const result = await provider.getWorkspaceFilesWSize();

    expect(result).toEqual([]);
  });
});
