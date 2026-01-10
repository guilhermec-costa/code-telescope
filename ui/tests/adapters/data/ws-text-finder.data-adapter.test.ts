import { describe, expect, it } from "vitest";
import { TextSearchData } from "../../../../shared/exchange/workspace-text-search";
import { WorkspaceTextFinderDataAdapter } from "../../../core/adapters/data/ws-text-finder.data-adapter";

describe("WorkspaceTextFinderDataAdapter", () => {
  const adapter = new WorkspaceTextFinderDataAdapter();

  const data: TextSearchData = {
    results: [
      {
        file: "/home/user/project/src/index.ts",
        line: 10,
        column: 5,
        preview: "const value = 42;",
        svgIconUrl: "file-icon",
        text: "",
      },
      {
        file: "/home/user/project/src/utils/math.ts",
        line: 3,
        column: 1,
        svgIconUrl: "file-icon",
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
      identifier: "/home/user/project/src/index.ts:10:5",
      file: "/home/user/project/src/index.ts",
      line: 10,
      svgIconUrl: "file-icon",
      preview: "const value = 42;",
    });
  });

  it("returns identifier as selection value", () => {
    const option = adapter.parseOptions(data)[1];

    const value = adapter.getSelectionValue(option);

    expect(value).toBe("/home/user/project/src/utils/math.ts:3:1");
  });

  it("filters by file path", () => {
    const option = adapter.parseOptions(data)[0];

    const result = adapter.filterOption(option, "index");

    expect(result).toBe(true);
  });

  it("filters by preview text", () => {
    const option = adapter.parseOptions(data)[1];

    const result = adapter.filterOption(option, "sum");

    expect(result).toBe(true);
  });

  it("returns false when query does not match", () => {
    const option = adapter.parseOptions(data)[0];

    const result = adapter.filterOption(option, "nonexistent");

    expect(result).toBe(false);
  });
});
