import { getGitRoots } from "@backend/core/finders/git/api-utils";
import { GitStashFinder } from "@backend/core/finders/git/git-stash.finder";
import { execAsync } from "@backend/utils/commands";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@backend/core/finders/git/api-utils", () => ({
  getGitRoots: vi.fn(),
}));

vi.mock("@backend/utils/commands", () => ({
  execAsync: vi.fn(),
}));

describe("GitStashFinder", () => {
  let finder: GitStashFinder;

  beforeEach(() => {
    vi.clearAllMocks();
    finder = new GitStashFinder();
  });

  it("parses stash entries and keeps the full message after the first pipe", async () => {
    vi.mocked(getGitRoots).mockResolvedValueOnce([{ path: "/repo", name: "workspace" }]);
    vi.mocked(execAsync).mockResolvedValueOnce({
      stdout: "stash@{2}|wip: parser | keep this tail",
      stderr: "",
    });

    const result = await finder.querySelectableOptions();

    expect(result).toEqual([
      {
        index: 2,
        message: "wip: parser | keep this tail",
        repoPath: "/repo",
        repoName: undefined,
      },
    ]);
  });

  it("applies the selected stash on selection", async () => {
    vi.mocked(execAsync).mockResolvedValueOnce({ stdout: "", stderr: "" });

    await finder.onSelect({
      index: 3,
      message: "stash",
      repoPath: "/repo",
    });

    expect(execAsync).toHaveBeenCalledWith("git stash apply stash@{3}", { cwd: "/repo" });
  });

  it("returns a friendly message when git is not available for preview", async () => {
    vi.mocked(execAsync).mockRejectedValueOnce({ code: "ENOENT" });

    const preview = await finder.getPreviewData({
      index: 1,
      message: "stash",
      repoPath: "/repo",
    });

    expect(preview.content).toBe("git not found in PATH.");
    expect(preview.language).toBe("plaintext");
  });
});
