import { describe, expect, it } from "vitest";
import { BranchInfo } from "../../../../shared/exchange/branch-search";
import { BranchFinderDataAdapter } from "../../../core/adapters/data/branch-finder.data-adapter";

describe("BranchFinderDataAdapter", () => {
  const adapter = new BranchFinderDataAdapter();

  const branches: BranchInfo[] = [
    {
      name: "main",
      current: true,
      remote: "",
    },
    {
      name: "develop",
      current: false,
      remote: "",
    },
    {
      name: "feature/login",
      current: false,
      remote: "origin",
    },
  ];

  it("returns branches as-is on parseOptions", () => {
    const options = adapter.parseOptions(branches);

    expect(options).toBe(branches);
    expect(options).toHaveLength(3);
  });

  it("formats html wrapper for current local branch", () => {
    const text = adapter.getHtmlWrapper(branches[0], "* main");

    expect(text).toBe(
      `<i class="codicon codicon-git-branch file-icon sk-git-branch"></i><span class="file-path">* main</span>`,
    );
  });

  it("formats html wrapper for non-current local branch", () => {
    const text = adapter.getHtmlWrapper(branches[1], "  develop");
    expect(text).toBe(
      `<i class="codicon codicon-git-branch file-icon sk-git-branch"></i><span class="file-path">  develop</span>`,
    );
  });

  it("formats html wrapper for remote branch", () => {
    const text = adapter.getHtmlWrapper(branches[2], "  feature/login (origin)");
    expect(text).toBe(
      `<i class="codicon codicon-git-branch file-icon sk-git-branch"></i><span class="file-path">  feature/login (origin)</span>`,
    );
  });

  it("returns branch name as selection value", () => {
    const value = adapter.getSelectionValue(branches[2]);

    expect(value).toBe("feature/login");
  });

  it("filters using search text (case insensitive)", () => {
    const result = adapter.filterOption(branches[2], "login");

    expect(result).toBe(true);
  });

  it("matches prefix and remote info in filter", () => {
    const result = adapter.filterOption(branches[0], "main");

    expect(result).toBe(true);
  });

  it("returns false when query does not match", () => {
    const result = adapter.filterOption(branches[1], "release");

    expect(result).toBe(false);
  });
});
