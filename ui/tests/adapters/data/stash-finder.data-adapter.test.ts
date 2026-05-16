import { describe, expect, it } from "vitest";
import { StashInfo } from "../../../../shared/exchange/stash";
import { GitStashDataAdapter } from "../../../core/adapters/data/stash-finder.data-adapter";

describe("GitStashDataAdapter", () => {
  const adapter = new GitStashDataAdapter();
  const stash: StashInfo = {
    index: 2,
    message: "wip: keep parser stable",
    repoName: "workspace",
    repoPath: "/repo",
  };

  it("returns stashes as-is on parseOptions", () => {
    expect(adapter.parseOptions([stash])).toEqual([stash]);
  });

  it("includes ref and message in the search text", () => {
    expect(adapter.getSearchText(stash)).toBe("stash@{2} wip: keep parser stable");
  });

  it("splits ref and message in the html wrapper", () => {
    const html = adapter.getHtmlWrapper(stash, "stash@{2} wip: keep parser stable");

    expect(html).toContain("codicon-git-stash");
    expect(html).toContain('<span class="sk-commit-hash">stash@{2}</span>');
    expect(html).toContain('<span class="file-path">wip: keep parser stable</span>');
    expect(html).toContain('<span class="sk-repo-tag">workspace</span>');
  });

  it("returns the stash itself as selection value", () => {
    expect(adapter.getSelectionValue(stash)).toEqual(stash);
  });
});
