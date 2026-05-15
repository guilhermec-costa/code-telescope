import { execAsync } from "@backend/utils/commands";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGitRoots } from "../../core/finders/git/api-utils";
import { GitDiffFuzzyFinder } from "../../core/finders/git/git-diff.finder";

vi.mock("../../core/finders/git/api-utils", () => ({
  getGitRoots: vi.fn(),
}));

vi.mock("@backend/utils/commands", () => ({
  execAsync: vi.fn(),
}));

describe("GitDiffFuzzyFinder", () => {
  let finder: GitDiffFuzzyFinder;

  beforeEach(() => {
    vi.clearAllMocks();
    finder = new GitDiffFuzzyFinder();
  });

  it("returns empty list when there are no git roots", async () => {
    vi.mocked(getGitRoots).mockResolvedValueOnce([]);

    const result = await finder.querySelectableOptions();

    expect(result).toEqual([]);
  });

  it("combines staged, unstaged and untracked diffs", async () => {
    vi.mocked(getGitRoots).mockResolvedValueOnce([{ path: "/repo", name: "workspace" }]);
    vi.mocked(execAsync)
      .mockResolvedValueOnce({ stdout: "M\tstaged.ts\nA\tnew.ts", stderr: "" })
      .mockResolvedValueOnce({ stdout: "M\tunstaged.ts", stderr: "" })
      .mockResolvedValueOnce({ stdout: "untracked.ts", stderr: "" });

    const result = await finder.querySelectableOptions();

    expect(result).toEqual([
      {
        repoPath: "/repo",
        repoName: undefined,
        relativePath: "staged.ts",
        absolutePath: "/repo/staged.ts",
        status: "M",
        kind: "staged",
      },
      {
        repoPath: "/repo",
        repoName: undefined,
        relativePath: "new.ts",
        absolutePath: "/repo/new.ts",
        status: "A",
        kind: "staged",
      },
      {
        repoPath: "/repo",
        repoName: undefined,
        relativePath: "unstaged.ts",
        absolutePath: "/repo/unstaged.ts",
        status: "M",
        kind: "unstaged",
      },
      {
        repoPath: "/repo",
        repoName: undefined,
        relativePath: "untracked.ts",
        absolutePath: "/repo/untracked.ts",
        status: "??",
        kind: "untracked",
      },
    ]);
  });

  it("returns diff preview for untracked files from git stdout even on exit code 1", async () => {
    vi.mocked(execAsync).mockRejectedValueOnce({
      code: 1,
      stdout: "diff --git a/file.ts b/file.ts\n+content",
    });

    const preview = await finder.getPreviewData({
      repoPath: "/repo",
      relativePath: "file.ts",
      absolutePath: "/repo/file.ts",
      status: "??",
      kind: "untracked",
    });

    expect(preview.kind).toBe("text");
    expect(preview.language).toBe("diff");
    expect(preview.content).toContain("diff --git");
  });
});
