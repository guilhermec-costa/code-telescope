import { DiagnosticsFinder } from "@backend/core/finders/diagnostics.finder";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@backend/utils/files", () => ({
  getLanguageIdForFile: vi.fn().mockReturnValue("typescript"),
}));

vi.mock("@backend/core/common/file-reader", () => ({
  FileReader: {
    read: vi.fn().mockResolvedValue("file content"),
  },
}));

vi.mock("vscode", () => ({
  languages: {
    getDiagnostics: vi.fn().mockReturnValue([]),
    onDidChangeDiagnostics: vi.fn(),
  },
  window: {
    showTextDocument: vi.fn(),
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
}));

describe("DiagnosticsFinder", () => {
  let finder: DiagnosticsFinder;

  beforeEach(() => {
    vi.clearAllMocks();
    finder = new DiagnosticsFinder();
  });

  describe("querySelectableOptions", () => {
    it("should return empty when no diagnostics", async () => {
      const { languages } = await import("vscode");
      vi.mocked(languages.getDiagnostics).mockReturnValue([]);

      const result = await finder.querySelectableOptions();

      expect(result.diagnostics).toEqual([]);
      expect(result.displayTexts).toEqual([]);
    });
  });

  describe("onSelect", () => {
    it("should do nothing for invalid index", async () => {
      const { languages } = await import("vscode");
      vi.mocked(languages.getDiagnostics).mockReturnValue([]);

      await finder.onSelect("999");

      const { window } = await import("vscode");
      expect(window.showTextDocument).not.toHaveBeenCalled();
    });
  });

  describe("getPreviewData", () => {
    it("should return default message for invalid index", async () => {
      const { languages } = await import("vscode");
      vi.mocked(languages.getDiagnostics).mockReturnValue([]);

      const result = await finder.getPreviewData("999");

      expect(result.content).toBe("No diagnostic selected");
    });
  });
});
