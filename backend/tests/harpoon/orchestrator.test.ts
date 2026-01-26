import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { HarpoonMark } from "../../../shared/exchange/harpoon";
import { HarpoonOrchestrator } from "../../harpoon/orchestrator";
import { HarpoonStorage } from "../../harpoon/storage";

describe("HarpoonOrchestrator", () => {
  let context: vscode.ExtensionContext;
  let manager: HarpoonOrchestrator;

  beforeEach(() => {
    (HarpoonOrchestrator as any).instance = undefined;

    context = {
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
      subscriptions: [],
    } as any;

    manager = HarpoonOrchestrator.getInstance(context);
  });

  describe("Singleton Pattern", () => {
    it("should return same instance on multiple calls", () => {
      const instance1 = HarpoonOrchestrator.getInstance(context);
      const instance2 = HarpoonOrchestrator.getInstance(context);

      expect(instance1).toBe(instance2);
    });
  });

  describe("addFile", () => {
    it("should add file to marks", async () => {
      const uri = vscode.Uri.parse("file:///test.ts");
      const position = new vscode.Position(10, 5);

      const result = await manager.addFile(uri, position);

      expect(result).toBe(true);
      expect(manager.getMarkCount()).toBe(1);

      const marks = manager.getMarks();
      expect(marks[0].uri).toBe(uri);
      expect(marks[0].position).toBe(position);
    });

    it("should not duplicate marks for same file", async () => {
      const uri = vscode.Uri.parse("file:///test.ts");

      await manager.addFile(uri);
      await manager.addFile(uri);

      expect(manager.getMarkCount()).toBe(1);
    });

    it("should update position when re-marking same file", async () => {
      const uri = vscode.Uri.parse("file:///test.ts");
      const position1 = new vscode.Position(10, 0);
      const position2 = new vscode.Position(20, 5);

      await manager.addFile(uri, position1);
      await manager.addFile(uri, position2);

      const marks = manager.getMarks();
      expect(marks[0].position).toBe(position2);
    });

    it("should return false when no file is provided", async () => {
      const result = await manager.addFile();

      expect(result).toBe(false);
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith("No file to mark");
    });
  });

  describe("removeFile", () => {
    it("should remove mark at valid index", async () => {
      const uri1 = vscode.Uri.parse("file:///test1.ts");
      const uri2 = vscode.Uri.parse("file:///test2.ts");

      await manager.addFile(uri1);
      await manager.addFile(uri2);

      const result = await manager.removeFile(0);

      expect(result).toBe(true);
      expect(manager.getMarkCount()).toBe(1);
      expect(manager.getMarks()[0].uri).toBe(uri2);
    });

    it("should return false for invalid index", async () => {
      const result = await manager.removeFile(5);

      expect(result).toBe(false);
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it("should return false for negative index", async () => {
      const result = await manager.removeFile(-1);

      expect(result).toBe(false);
    });
  });

  describe("navigateTo", () => {
    it("should return false for invalid index", async () => {
      const result = await manager.navigateTo(0);

      expect(result).toBe(false);
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it("should handle navigation errors gracefully", async () => {
      const uri = vscode.Uri.parse("file:///test.ts");
      await manager.addFile(uri);

      vi.mocked(vscode.workspace.openTextDocument).mockRejectedValue(new Error("File not found"));

      const result = await manager.navigateTo(0);

      expect(result).toBe(false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe("reorder", () => {
    it("should reorder marks correctly", async () => {
      const uri1 = vscode.Uri.parse("file:///test1.ts");
      const uri2 = vscode.Uri.parse("file:///test2.ts");
      const uri3 = vscode.Uri.parse("file:///test3.ts");

      await manager.addFile(uri1);
      await manager.addFile(uri2);
      await manager.addFile(uri3);

      await manager.reorder(0, 2); // move first to last

      const marks = manager.getMarks();
      expect(marks[0].uri).toBe(uri2);
      expect(marks[1].uri).toBe(uri3);
      expect(marks[2].uri).toBe(uri1);
    });

    it("should return false for invalid indices", async () => {
      const uri = vscode.Uri.parse("file:///test.ts");
      await manager.addFile(uri);

      const result = await manager.reorder(0, 5);

      expect(result).toBe(false);
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });
  });

  describe("clear", () => {
    it("should clear all marks", async () => {
      const uri1 = vscode.Uri.parse("file:///test1.ts");
      const uri2 = vscode.Uri.parse("file:///test2.ts");

      await manager.addFile(uri1);
      await manager.addFile(uri2);

      await manager.clearMarks();

      expect(manager.getMarkCount()).toBe(0);
      expect(manager.getMarks()).toHaveLength(0);
    });
  });

  describe("updateLabel", () => {
    it("should update label for valid index", async () => {
      const uri = vscode.Uri.parse("file:///test.ts");
      await manager.addFile(uri);

      const result = await manager.updateLabel(0, "Main Component");

      expect(result).toBe(true);
      expect(manager.getMarks()[0].label).toBe("Main Component");
    });

    it("should clear label when undefined is passed", async () => {
      const uri = vscode.Uri.parse("file:///test.ts");
      await manager.addFile(uri);
      await manager.updateLabel(0, "Test");

      await manager.updateLabel(0, undefined);

      expect(manager.getMarks()[0].label).toBeUndefined();
    });

    it("should return false for invalid index", async () => {
      const result = await manager.updateLabel(5, "Test");

      expect(result).toBe(false);
    });
  });

  describe("Helper Methods", () => {
    it("isMarked should return true for marked files", async () => {
      const uri = vscode.Uri.parse("file:///test.ts");
      await manager.addFile(uri);

      expect(manager.isMarked(uri)).toBe(true);
    });

    it("isMarked should return false for unmarked files", () => {
      const uri = vscode.Uri.parse("file:///test.ts");

      expect(manager.isMarked(uri)).toBe(false);
    });

    it("getMarkIndex should return correct index", async () => {
      const uri1 = vscode.Uri.parse("file:///test1.ts");
      const uri2 = vscode.Uri.parse("file:///test2.ts");

      await manager.addFile(uri1);
      await manager.addFile(uri2);

      expect(manager.getMarkIndex(uri1)).toBe(0);
      expect(manager.getMarkIndex(uri2)).toBe(1);
    });

    it("getMarkIndex should return -1 for unmarked files", () => {
      const uri = vscode.Uri.parse("file:///test.ts");

      expect(manager.getMarkIndex(uri)).toBe(-1);
    });
  });
});

describe("HarpoonStorage", () => {
  let context: vscode.ExtensionContext;
  let storage: HarpoonStorage;

  beforeEach(() => {
    context = {
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(() => Promise.resolve()),
      },
    } as any;

    storage = new HarpoonStorage(context);
  });

  describe("save", () => {
    it("should serialize marks correctly", async () => {
      const marks: HarpoonMark[] = [
        {
          uri: vscode.Uri.parse("file:///test.ts"),
          position: new vscode.Position(10, 5),
          label: "Test",
        },
      ];

      await storage.save(marks);

      expect(context.workspaceState.update).toHaveBeenCalledWith(
        "harpoon.marks",
        expect.objectContaining({
          marks: expect.arrayContaining([
            expect.objectContaining({
              uriString: "file:///test.ts",
              label: "Test",
              position: { line: 10, character: 5 },
            }),
          ]),
        }),
      );
    });
  });

  describe("clear", () => {
    it("should clear workspace state", async () => {
      await storage.clearAllMarks();

      expect(context.workspaceState.update).toHaveBeenCalledWith("harpoon.marks", undefined);
    });
  });
});
