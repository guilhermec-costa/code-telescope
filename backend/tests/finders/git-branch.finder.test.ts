import { getGitRoots } from "@backend/core/finders/git/api-utils";
import { GitBranchFuzzyFinder } from "@backend/core/finders/git/git-branch.finder";
import { execAsync, execFileAsync } from "@backend/utils/commands";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@backend/core/finders/git/api-utils", () => ({
  getGitRoots: vi.fn(),
}));

vi.mock("@backend/utils/commands", () => ({
  execAsync: vi.fn(),
  execFileAsync: vi.fn(),
}));

describe("GitBranchFuzzyFinder", () => {
  let provider: GitBranchFuzzyFinder;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new GitBranchFuzzyFinder();
  });

  it("returns empty list when git api is null", async () => {
    vi.mocked(getGitRoots).mockResolvedValueOnce([]);

    const finder = new GitBranchFuzzyFinder();
    const result = await finder.querySelectableOptions();

    expect(result).toEqual([]);
  });

  it("includes remote branches when includeRemotes is true", async () => {
    vi.mocked(getGitRoots).mockResolvedValueOnce([{ path: "/proj", name: "myproject" }]);
    vi.mocked(execAsync)
      .mockResolvedValueOnce({ stdout: "main\norigin/dev", stderr: "" })
      .mockResolvedValueOnce({ stdout: "main", stderr: "" })
      .mockResolvedValueOnce({ stdout: "origin", stderr: "" });

    const finder = new GitBranchFuzzyFinder({ includeRemotes: true });
    const branches = await finder.querySelectableOptions();

    expect(branches).toHaveLength(2);
  });

  it("returns commits as preview data", async () => {
    vi.mocked(execAsync).mockResolvedValueOnce({
      stdout: "abc123|initial commit|Gui|2024-01-01",
      stderr: "",
    });

    const preview = await provider.getPreviewData({
      name: "main",
      repoPath: "/proj",
    });

    expect(preview.content).toHaveLength(1);
    expect((preview.content as any)[0].hash).toBe("abc123");
    expect((preview.content as any)[0].message).toBe("initial commit");
  });

  it("uses argument-based git checkout for branch selection", async () => {
    vi.mocked(execFileAsync).mockResolvedValueOnce({ stdout: "", stderr: "" });

    await provider.onSelect({
      name: "feature/safe-checkout",
      repoPath: "/proj",
    });

    expect(execFileAsync).toHaveBeenCalledWith("git", ["checkout", "feature/safe-checkout"], { cwd: "/proj" });
  });
});
