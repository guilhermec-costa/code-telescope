import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { FileContentCache } from "../../core/common/cache/file-content.cache";
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
    vi.mocked(vscode.workspace.asRelativePath).mockImplementation((p: any) => `rel/${p}`);
    provider = new WorkspaceFileFinder();
    vi.clearAllMocks();
  });

  it("returns absolute and relative file paths", async () => {
    vi.mocked(vscode.workspace.findFiles).mockResolvedValueOnce([{ path: "/abs/a.ts" }, { path: "/abs/b.ts" }] as any);

    vi.mocked(vscode.workspace.fs.stat)
      .mockResolvedValueOnce({ size: 1 } as any)
      .mockResolvedValueOnce({ size: 1 } as any);

    const result = await provider.querySelectableOptions();

    expect(result.abs).toEqual(["/abs/a.ts", "/abs/b.ts"]);
    expect(result.relative).toEqual(["rel//abs/a.ts", "rel//abs/b.ts"]);
  });

  it("opens selected file", async () => {
    await provider.onSelect("/abs/file.ts");

    expect(execCmd).toHaveBeenCalled();
  });

  it("loads file content when not cached", async () => {
    vi.mocked(FileContentCache.instance.get).mockResolvedValueOnce("file content");

    const result: any = await provider.getPreviewData("/abs/file.ts");

    expect(result.content.text).toBe("file content");
  });
});
