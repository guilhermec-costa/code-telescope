import { describe, expect, it } from "vitest";
import { BranchInfo } from "../../../../shared/exchange/branch-search";
import { BranchFinderDataAdapter } from "../../../core/adapters/data/branch-finder.data-adapter";

describe("BranchFinderDataAdapter", () => {
  const adapter = new BranchFinderDataAdapter();

  const branches: BranchInfo[] = [
    {
      name: "main",
      current: true,
      remote: false,
      repoPath: "/proj",
    },
    {
      name: "develop",
      current: false,
      remote: false,
      repoPath: "/proj",
    },
    {
      name: "feature/login",
      current: false,
      remote: true,
      repoPath: "/proj",
    },
  ];

  it("returns branches as-is on parseOptions", () => {
    const options = adapter.parseOptions(branches);

    expect(options).toBe(branches);
    expect(options).toHaveLength(3);
  });

  it("formats html wrapper for current local branch", () => {
    const text = adapter.getHtmlWrapper(branches[0], "* main");

    expect(text).toContain('<i class="codicon codicon-git-branch file-icon"></i>');
    expect(text).toContain('<span class="file-path">* main</span>');
  });

  it("formats html wrapper for non-current local branch", () => {
    const text = adapter.getHtmlWrapper(branches[1], "  develop");
    expect(text).toContain('<i class="codicon codicon-git-branch file-icon"></i>');
    expect(text).toContain('<span class="file-path">  develop</span>');
  });

  it("formats html wrapper for remote branch", () => {
    const text = adapter.getHtmlWrapper(branches[2], "  feature/login (origin)");
    expect(text).toContain('<i class="codicon codicon-cloud file-icon"></i>');
    expect(text).toContain('<span class="file-path">  feature/login (origin)</span>');
  });

  it("returns branch info object as selection value", () => {
    const value = adapter.getSelectionValue(branches[2]);

    expect(value).toEqual(branches[2]);
  });
});
