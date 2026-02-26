import { WorkspaceSymbolsFinder } from "@backend/core/finders/ws-symbols.finder";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { execCmd } from "../../utils/commands";

vi.mock("@backend/utils/files", () => ({
  getLanguageIdForFile: vi.fn().mockReturnValue("typescript"),
}));

vi.mock("@backend/utils/symbol", () => ({
  getSymbolCodicon: vi.fn().mockReturnValue("symbol-method"),
}));

vi.mock("@backend/core/common/file-reader", () => ({
  FileReader: {
    read: vi.fn().mockResolvedValue("file content"),
  },
}));

vi.mock("@backend/utils/commands", () => ({
  execCmd: vi.fn(),
}));

describe("WorkspaceSymbolsFinder", () => {
  let finder: WorkspaceSymbolsFinder;

  beforeEach(() => {
    vi.clearAllMocks();
    finder = new WorkspaceSymbolsFinder();
  });

  describe("querySelectableOptions", () => {
    it("should return empty when no symbols", async () => {
      vi.mocked(execCmd).mockResolvedValue([]);

      const result = await finder.querySelectableOptions();

      expect(result.symbols).toEqual([]);
      expect(result.displayTexts).toEqual([]);
    });
  });

  describe("onSelect", () => {
    it("should do nothing for invalid index", async () => {
      vi.mocked(execCmd).mockResolvedValue([]);

      await finder.onSelect("999");

      const { workspace } = await import("vscode");
      expect(workspace.openTextDocument).not.toHaveBeenCalled();
    });
  });

  describe("getPreviewData", () => {
    it("should return default message for invalid index", async () => {
      vi.mocked(execCmd).mockResolvedValue([]);

      const result = await finder.getPreviewData("999");

      expect(result.content).toBe("No symbol selected");
      expect(result.language).toBe("plaintext");
    });
  });
});
