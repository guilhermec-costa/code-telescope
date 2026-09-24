import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { FileReader } from "../../../core/common/file-reader";
import { RecentFilesFinder } from "../../../core/finders/file/recent-files.finder";
import { execCmd } from "../../../utils/commands";

vi.mock("@backend/utils/files", () => ({
  getSvgIconUrl: vi.fn().mockReturnValue("svg://file"),
}));

vi.mock("@backend/core/common/file-reader", () => ({
  FileReader: {
    read: vi.fn().mockResolvedValue("file content"),
  },
}));

vi.mock("@backend/utils/commands", () => ({
  execCmd: vi.fn(),
}));

describe("RecentFilesFinder", () => {
  let finder: RecentFilesFinder;

  beforeEach(() => {
    vi.clearAllMocks();
    finder = new RecentFilesFinder();
    vi.mocked(vscode.workspace.asRelativePath).mockImplementation(
      (path: any) => path.fsPath || path.path || String(path),
    );
    (vscode.window.tabGroups.all as any) = [];
    (vscode.window.terminals as any) = [];
  });

  describe("onSelect", () => {
    it("should execute openFile command", async () => {
      await finder.onSelect("/workspace/src/index.ts");

      expect(execCmd).toHaveBeenCalled();
    });

    it("should reveal an open terminal selection", async () => {
      const terminal = { name: "dev shell", show: vi.fn() } as any;
      (vscode.window.terminals as any) = [terminal];

      await finder.onSelect("terminal://dev%20shell");

      expect(terminal.show).toHaveBeenCalledOnce();
      expect(execCmd).not.toHaveBeenCalled();
    });
  });

  describe("getPreviewData", () => {
    it("should return text preview data", async () => {
      vi.mocked(FileReader.read).mockResolvedValue("console.log('test')");

      const result = await finder.getPreviewData("/workspace/src/index.ts");

      expect(result.kind).toBe("text");
      expect(result.content).toBe("console.log('test')");
    });

    it("should return a placeholder preview for terminals", async () => {
      const result = await finder.getPreviewData("terminal://dev%20shell");

      expect(result.kind).toBe("text");
      expect(result.content).toContain("Terminal preview is not available");
    });
  });

  describe("querySelectableOptions", () => {
    it("should include file and terminal tabs from the editor area", async () => {
      const terminalTab = {
        label: "dev shell",
        input: new (vscode.TabInputTerminal as any)(),
      };
      const fileTab = {
        label: "index.ts",
        input: {
          uri: vscode.Uri.file("/workspace/src/index.ts"),
        },
      };

      (vscode.window.tabGroups.all as any) = [
        {
          tabs: [fileTab, terminalTab],
        },
      ];

      const result = await finder.querySelectableOptions();

      expect(result.files).toEqual(
        expect.arrayContaining([
          {
            kind: "file",
            path: "/workspace/src/index.ts",
            relativePath: "/workspace/src/index.ts",
            lastModified: expect.any(Date),
            exists: false,
          },
          {
            kind: "terminal",
            path: "terminal://dev%20shell",
            relativePath: "[Terminal] dev shell",
            lastModified: expect.any(Date),
            exists: true,
          },
        ]),
      );
      expect(result.files).toHaveLength(2);
      expect(result.displayTexts).toHaveLength(2);
    });
  });
});
