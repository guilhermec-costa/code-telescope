import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileFinderData } from "../../../../shared/exchange/file-search";
import { FileOption, WorkspaceFilesFinderDataAdapter } from "../../../core/adapters/data/ws-files-finder.data-adapter";
import { formatFileOptionHtml } from "../../../utils/html";

describe("WorkspaceFilesFinderDataAdapter", () => {
  let adapter: WorkspaceFilesFinderDataAdapter;

  beforeEach(() => {
    adapter = new WorkspaceFilesFinderDataAdapter();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("parseOptions", () => {
    it("should map absolute and relative paths correctly", () => {
      const data: FileFinderData = {
        relative: ["file1.ts", "file2.ts"],
        abs: ["root/file1.ts", "root/file2.ts"],
      };

      const result = adapter.parseOptions(data);

      expect(result).toEqual([
        {
          relative: "file1.ts",
          absolute: "root/file1.ts",
        },
        {
          relative: "file2.ts",
          absolute: "root/file2.ts",
        },
      ]);
    });

    it("should return an empty array when data is empty", () => {
      const data: FileFinderData = {
        relative: [],
        abs: [],
      };

      const result = adapter.parseOptions(data);

      expect(result).toEqual([]);
    });
  });

  describe("getHtmlWrapper", () => {
    it("should return the relative path wrapped with icon", () => {
      vi.stubGlobal("__FILE_PATH_DISPLAY__", "relative");
      const option: FileOption = {
        relative: "file.ts",
        absolute: "root/file.ts",
      };

      const result = adapter.getHtmlWrapper(option, "file.ts");
      const output = formatFileOptionHtml("./vendor/material-icons/typescript.svg", "file.ts");
      expect(result).toBe(output);
    });
  });

  describe("getSearchText", () => {
    const option: FileOption = {
      relative: "src/components/file.ts",
      absolute: "/home/user/project/src/components/file.ts",
    };

    it.each([
      ["relative", "src/components/file.ts"],
      ["absolute", "/home/user/project/src/components/file.ts"],
      ["filename-only", "file.ts"],
    ] as const)("uses the %s path display mode", (mode, expected) => {
      vi.stubGlobal("__FILE_PATH_DISPLAY__", mode);

      expect(adapter.getSearchText(option)).toBe(expected);
    });
  });

  describe("getSelectionValue", () => {
    it("should return the relative path", () => {
      const option: FileOption = {
        relative: "file.ts",
        absolute: "root/file.ts",
      };

      const result = adapter.getSelectionValue(option);
      expect(result).toBe(option.absolute);
    });
  });
});
