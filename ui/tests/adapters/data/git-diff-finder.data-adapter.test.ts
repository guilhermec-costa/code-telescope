import { describe, expect, it } from "vitest";
import { GitDiffInfo } from "../../../../shared/exchange/git-diff";
import { GitDiffFinderDataAdapter } from "../../../core/adapters/data/git-diff-finder.data-adapter";

describe("GitDiffFinderDataAdapter", () => {
  const adapter = new GitDiffFinderDataAdapter();
  const diff: GitDiffInfo = {
    repoPath: "/repo",
    repoName: "workspace",
    relativePath: "src/app.ts",
    absolutePath: "/repo/src/app.ts",
    status: "M",
    kind: "unstaged",
  };

  it("returns diffs as-is on parseOptions", () => {
    const result = adapter.parseOptions([diff]);

    expect(result).toEqual([diff]);
  });

  it("includes kind, status and path in search text", () => {
    expect(adapter.getSearchText(diff)).toBe("unstaged M src/app.ts");
  });

  it("renders diff html wrapper", () => {
    const html = adapter.getHtmlWrapper(diff, "unstaged M src/app.ts");

    expect(html).toContain('<span class="sk-git-diff-status sk-git-diff-status--modified">M</span>');
    expect(html).toContain('<span class="file-path">src/app.ts</span>');
    expect(html).toContain('<span class="sk-repo-tag">workspace</span>');
  });

  it("uses added styling for untracked files", () => {
    const html = adapter.getHtmlWrapper({ ...diff, kind: "untracked", status: "??" }, "untracked ?? src/new.ts");

    expect(html).toContain("sk-git-diff-status sk-git-diff-status--added");
    expect(html).toContain('<span class="file-path">src/new.ts</span>');
  });

  it("shows staged as subtle metadata", () => {
    const html = adapter.getHtmlWrapper({ ...diff, kind: "staged" }, "staged M src/app.ts");

    expect(html).toContain('<span class="sk-git-diff-meta">staged</span>');
  });

  it("returns diff info as selection value", () => {
    expect(adapter.getSelectionValue(diff)).toEqual(diff);
  });
});
