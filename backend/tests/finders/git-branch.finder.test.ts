import { beforeEach, describe, expect, it, vi } from "vitest";
import { API, Ref } from "../../@types/git";
import { getGitApi } from "../../core/finders/git/api-utils";
import { GitBranchFuzzyFinder } from "../../core/finders/git/git-branch.finder";

vi.mock("../../core/finders/git/api-utils", () => ({
  getGitApi: vi.fn(),
}));

describe("GitBranchFuzzyFinder", () => {
  let provider: GitBranchFuzzyFinder;

  const gitApiMock = {
    repositories: [
      {
        getRefs: vi.fn(),
        log: vi.fn(),
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGitApi).mockResolvedValue(gitApiMock as unknown as API);
    provider = new GitBranchFuzzyFinder();
  });

  it("returns empty list when git api is null", async () => {
    vi.mocked(getGitApi).mockResolvedValueOnce(null);

    const finder = new GitBranchFuzzyFinder();
    const result = await finder.querySelectableOptions();

    expect(result).toEqual([]);
    expect(getGitApi).toHaveBeenCalled();
  });

  it("includes remote branches when includeRemotes is true", async () => {
    const refs: Ref[] = [
      { name: "main", type: 0, remote: false } as any,
      { name: "origin/dev", type: 1, remote: true } as any,
    ];

    gitApiMock.repositories[0].getRefs.mockResolvedValueOnce(refs);

    const finder = new GitBranchFuzzyFinder({ includeRemotes: true });
    const branches = await finder.querySelectableOptions();

    expect(getGitApi).toHaveBeenCalled();
    expect(branches).toHaveLength(2);
  });

  it("returns commits as preview data", async () => {
    const commits = [
      {
        hash: "abc123",
        message: "initial commit",
        authorName: "Gui",
        authorDate: new Date("2024-01-01"),
      },
    ];

    gitApiMock.repositories[0].log.mockResolvedValueOnce(commits);

    const preview = await provider.getPreviewData("main");

    expect(getGitApi).toHaveBeenCalled();
    expect(preview.content).toHaveLength(1);
    expect((preview.content as any)[0].hash).toBe("abc123");
    expect((preview.content as any)[0].message).toBe("initial commit");
  });
});
