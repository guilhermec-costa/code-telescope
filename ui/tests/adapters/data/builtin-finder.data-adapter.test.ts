import { describe, expect, it } from "vitest";
import { BuiltinFinderData } from "../../../../shared/exchange/builtin";
import { BuiltinFinderDataAdapter, BuiltinFinderOption } from "../../../core/adapters/data/builtin-finder.data-adapter";

describe("BuiltinFinderDataAdapter", () => {
  const adapter = new BuiltinFinderDataAdapter();
  const data: BuiltinFinderData = {
    items: [
      {
        type: "git.diffs",
        name: "Git Diffs",
        description: "Current git changes",
      },
      {
        type: "workspace.files",
        name: "Workspace Files",
        description: "Search files",
      },
    ],
  };

  it("maps builtin items to indexed options", () => {
    const result = adapter.parseOptions(data);

    expect(result).toEqual<BuiltinFinderOption[]>([
      { index: 0, item: data.items[0] },
      { index: 1, item: data.items[1] },
    ]);
  });

  it("uses the item name as search text", () => {
    const option = adapter.parseOptions(data)[0];
    expect(adapter.getSearchText(option)).toBe("Git Diffs");
  });

  it("renders the telescope icon wrapper", () => {
    const option = adapter.parseOptions(data)[0];
    const html = adapter.getHtmlWrapper(option, "Git Diffs");

    expect(html).toContain("codicon-telescope");
    expect(html).toContain('<span class="file-path">Git Diffs</span>');
  });

  it("returns the index as string selection value", () => {
    const option = adapter.parseOptions(data)[1];
    expect(adapter.getSelectionValue(option)).toBe("1");
  });
});
