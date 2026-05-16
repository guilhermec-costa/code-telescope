import { describe, expect, it } from "vitest";
import { CommitSearchInfo } from "../../../../shared/exchange/commit-search";
import { CommitFinderDataAdapter } from "../../../core/adapters/data/commit-finder.data-adapter";

describe("CommitFinderDataAdapter", () => {
  const adapter = new CommitFinderDataAdapter();
  const commit: CommitSearchInfo = {
    hash: "abcdef123456",
    message: "add git diff finder",
    author: "Gui",
    date: "2024-01-01",
    repoName: "workspace",
    repoPath: "/repo",
  };

  it("returns commits as-is on parseOptions", () => {
    expect(adapter.parseOptions([commit])).toEqual([commit]);
  });

  it("uses a short hash in the search text", () => {
    expect(adapter.getSearchText(commit)).toBe("abcdef123 add git diff finder");
  });

  it("renders commit html with repo tag", () => {
    const html = adapter.getHtmlWrapper(commit, "abcdef123 add git diff finder");

    expect(html).toContain("codicon-git-commit");
    expect(html).toContain('<span class="file-path">abcdef123 add git diff finder</span>');
    expect(html).toContain('<span class="sk-repo-tag">workspace</span>');
  });

  it("returns the commit itself as selection value", () => {
    expect(adapter.getSelectionValue(commit)).toEqual(commit);
  });
});
