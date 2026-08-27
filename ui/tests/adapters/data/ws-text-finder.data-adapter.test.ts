import { afterEach, describe, expect, it, vi } from "vitest";
import { TextSearchData } from "../../../../shared/exchange/workspace-text-search";
import { TextFinderDataAdapter } from "../../../core/adapters/data/text-finder.data-adapter";

describe("WorkspaceTextFinderDataAdapter", () => {
  const adapter = new TextFinderDataAdapter();

  const data: TextSearchData = {
    results: [
      {
        file: "/home/user/project/src/index.ts",
        relativeFile: "src/index.ts",
        line: 10,
        column: 5,
        preview: "const value = 42;",
        text: "",
      },
      {
        file: "/home/user/project/src/utils/math.ts",
        relativeFile: "src/utils/math.ts",
        line: 3,
        column: 1,
        preview: "export function sum(a, b) {",
        text: "",
      },
    ],
    query: "const",
  };

  it("parses search results into options", () => {
    const options = adapter.parseOptions(data);

    expect(options).toHaveLength(2);

    expect(options[0]).toEqual({
      identifier: "/home/user/project/src/index.ts||10||5",
      file: "/home/user/project/src/index.ts",
      relativeFile: "src/index.ts",
      line: 10,
      preview: "const value = 42;",
    });
  });

  it("returns identifier as selection value", () => {
    const option = adapter.parseOptions(data)[1];

    const value = adapter.getSelectionValue(option);

    expect(value).toBe("/home/user/project/src/utils/math.ts||3||1");
  });

  it.each([
    ["relative", "src/index.ts:10 const value = 42;"],
    ["absolute", "/home/user/project/src/index.ts:10 const value = 42;"],
    ["filename-only", "index.ts:10 const value = 42;"],
  ] as const)("uses the %s path display mode", (mode, expected) => {
    vi.stubGlobal("__FILE_PATH_DISPLAY__", mode);
    const option = adapter.parseOptions(data)[0];

    expect(adapter.getSearchText(option)).toBe(expected);
    expect(adapter.calcHlOffsetChars(option)).toBe(expected.length - option.preview.length);
  });

  it("falls back to the filename when an older provider omits relativeFile", () => {
    vi.stubGlobal("__FILE_PATH_DISPLAY__", "relative");
    const legacyData: TextSearchData = {
      ...data,
      results: [{ ...data.results[0], relativeFile: undefined }],
    };

    expect(adapter.getSearchText(adapter.parseOptions(legacyData)[0])).toBe("index.ts:10 const value = 42;");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});
