import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileFinderData } from "../../../../shared/exchange/file-search";
import { FileOption, WorkspaceFilesFinderDataAdapter } from "../../../core/adapters/data/ws-files-finder.data-adapter";
import { formatFileOptionHtml } from "../../../utils/html";

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
        svgIconUrl: ["file-icon1", "file-icon2"],
      };

      const result = adapter.parseOptions(data);

      expect(result).toEqual([
        {
          absolute: "/root/file1.ts",
          relative: "file1.ts",
          svgIconUrl: "file-icon1",
        },
        {
          absolute: "/root/file2.ts",
          relative: "file2.ts",
          svgIconUrl: "file-icon2",
        },
      ]);
    });

    it("should return an empty array when data is empty", () => {
      const data: FileFinderData = {
        abs: [],
        relative: [],
        svgIconUrl: [],
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
        svgIconUrl: "file-icon",
      };

      const result = adapter.getDisplayText(option);
      const output = formatFileOptionHtml(option.svgIconUrl, option.relative);
      expect(result).toBe(output);
    });
  });

  describe("getSelectionValue", () => {
    it("should return the absolute path", () => {
      const option: FileOption = {
        absolute: "/root/file.ts",
        relative: "file.ts",
        svgIconUrl: "file-icon",
      };

      const result = adapter.getSelectionValue(option);
      expect(result).toBe(option.absolute);
    });
  });

  describe("filterOption", () => {
    it("should return true when relative path includes query (case insensitive)", () => {
      const option: FileOption = {
        absolute: "/root/MyFile.ts",
        relative: "MyFile.ts",
        svgIconUrl: "file-icon",
      };

      expect(adapter.filterOption(option, "myfile")).toBe(true);
      expect(adapter.filterOption(option, "FILE")).toBe(true);
      expect(adapter.filterOption(option, "ts")).toBe(true);
    });

    it("should return false when relative path does not include query", () => {
      const option: FileOption = {
        absolute: "/root/file.ts",
        relative: "file.ts",
        svgIconUrl: "file-icon",
      };

      expect(adapter.filterOption(option, "json")).toBe(false);
    });
  });
});
