import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { WorkspaceFileFinder } from "../../../core/finders/file/ws-files.finder";
import { execCmd } from "../../../utils/commands";

vi.mock("@backend/core/common/config-manager", () => ({
  ExtensionConfigManager: {
    wsFileFinderCfg: {
      excludePatterns: ["**/node_modules/**"],
      excludeHidden: true,
      includePatterns: ["**/*"],
      maxResults: 50000,
    },
  },
}));

vi.mock("@backend/config/exclude-patterns", () => ({
  DEFAULT_EXCLUDE_PATTERNS: ["**/dist/**", "**/build/**"],
}));

vi.mock("@backend/utils/files", () => ({
  resolvePathExt: vi.fn().mockReturnValue("ts"),
  getLanguageIdForFile: vi.fn().mockReturnValue("typescript"),
}));

vi.mock("@backend/core/common/file-reader", () => ({
  FileReader: {
    read: vi.fn().mockResolvedValue("file content"),
  },
}));

vi.mock("@backend/utils/commands");

describe("WorkspaceFileFinder", () => {
  let finder: WorkspaceFileFinder;

  beforeEach(() => {
    vi.clearAllMocks();
    finder = new WorkspaceFileFinder();
  });

  describe("constructor", () => {
    it("should have correct chunkSize", () => {
      expect(finder.chunkSize).toBe(5500);
    });

    it("should have correct concurrency", () => {
      expect(finder.concurrency).toBe(16);
    });
  });

  describe("mapChunk", () => {
    it("should map files to relative and absolute paths", () => {
      vi.mocked(vscode.workspace.asRelativePath).mockImplementation((path) => {
        if (typeof path === "string") return path.replace("/workspace/", "");
        return "relative";
      });

      const files = ["/workspace/src/index.ts", "/workspace/src/utils.ts"];
      const result = finder.mapChunk(files);

      expect(result.relative).toEqual(["src/index.ts", "src/utils.ts"]);
      expect(result.abs).toEqual(files);
    });

    it("should handle empty array", () => {
      const result = finder.mapChunk([]);
      expect(result.relative).toEqual([]);
      expect(result.abs).toEqual([]);
    });
  });

  describe("querySelectableOptions", () => {
    it("should return empty array when no workspace folders", async () => {
      Object.defineProperty(vscode.workspace, "workspaceFolders", {
        get: () => undefined,
        configurable: true,
      });

      const result = await finder.querySelectableOptions();
      expect(result).toEqual([]);
    });

    it("should return empty array when workspace folders is empty", async () => {
      Object.defineProperty(vscode.workspace, "workspaceFolders", {
        get: () => [],
        configurable: true,
      });

      const result = await finder.querySelectableOptions();
      expect(result).toEqual([]);
    });
  });

  describe("onSelect", () => {
    it("should execute openFile command with file path", async () => {
      await finder.onSelect("/workspace/src/index.ts");

      expect(execCmd).toHaveBeenCalled();
    });
  });
});
