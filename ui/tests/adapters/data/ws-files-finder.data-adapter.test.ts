import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileFinderData } from "../../../../shared/exchange/file-search";
import { FileOption, WorkspaceFilesFinderDataAdapter } from "../../../core/adapters/data/ws-files-finder.data-adapter";

describe("WorkspaceFilesFinderDataAdapter", () => {
  let adapter: WorkspaceFilesFinderDataAdapter;

  beforeEach(() => {
    adapter = new WorkspaceFilesFinderDataAdapter();
  });

  describe("parseOptions", () => {
    it("should map absolute and relative paths correctly", () => {
      const data: FileFinderData = {
        abs: ["/root/file1.ts", "/root/file2.ts"],
        relative: ["file1.ts", "file2.ts"],
      };

      const result = adapter.parseOptions(data);

      expect(result).toEqual([
        {
          absolute: "/root/file1.ts",
          relative: "file1.ts",
        },
        {
          absolute: "/root/file2.ts",
          relative: "file2.ts",
        },
      ]);
    });

    it("should return an empty array when data is empty", () => {
      const data: FileFinderData = {
        abs: [],
        relative: [],
      };

      const result = adapter.parseOptions(data);

      expect(result).toEqual([]);
    });
  });

  describe("getDisplayText", () => {
    it("should return the relative path", () => {
      vi.stubGlobal("__FILE_PATH_DISPLAY__", "relative");
      const option: FileOption = {
        absolute: "/root/file.ts",
        relative: "file.ts",
      };

      const result = adapter.getDisplayText(option);

      expect(result).toBe("file.ts");
    });
  });

  describe("getSelectionValue", () => {
    it("should return the absolute path", () => {
      const option: FileOption = {
        absolute: "/root/file.ts",
        relative: "file.ts",
      };

      const result = adapter.getSelectionValue(option);

      expect(result).toBe("/root/file.ts");
    });
  });

  describe("filterOption", () => {
    it("should return true when relative path includes query (case insensitive)", () => {
      const option: FileOption = {
        absolute: "/root/MyFile.ts",
        relative: "MyFile.ts",
      };

      expect(adapter.filterOption(option, "myfile")).toBe(true);
      expect(adapter.filterOption(option, "FILE")).toBe(true);
      expect(adapter.filterOption(option, "ts")).toBe(true);
    });

    it("should return false when relative path does not include query", () => {
      const option: FileOption = {
        absolute: "/root/file.ts",
        relative: "file.ts",
      };

      expect(adapter.filterOption(option, "json")).toBe(false);
    });
  });
});
