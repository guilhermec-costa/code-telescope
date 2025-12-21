import { beforeEach, describe, expect, it, vi } from "vitest";
import { API, Ref } from "../../@types/git";
import { getGitApi } from "../../core/finders/git/api-utils";
import { GitBranchFuzzyFinder } from "../../core/finders/git/git-branch.finder";

vi.mock("../../core/finders/git/api-utils.ts");

describe("GitBranchFuzzyFinder", () => {
  let provider: GitBranchFuzzyFinder;

  let gitApiMock = {
    repositories: [
      {
        getRefs: vi.fn(),
        log: vi.fn(),
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getGitApi).mockReturnValue(gitApiMock as unknown as API);
    provider = new GitBranchFuzzyFinder();
  });

  it("should instantiate git api", () => {
    vi.mocked(getGitApi).mockReturnValueOnce({} as any);
    const _finder = new GitBranchFuzzyFinder();

    expect(_finder["gitApi"]).toBeDefined();
    expect(_finder["gitApi"]).not.toBeNull();
  });

  it("returns html load config", () => {
    const cfg = provider.getHtmlLoadConfig();

    expect(cfg.fileName).toBe("branch-fuzzy.view.html");
    expect(cfg.placeholders["{{style}}"]).toBe("ui/style/style.css");
  });

  it("returns empty list when git api is null", async () => {
    vi.mocked(getGitApi).mockReturnValueOnce(null);

    const _finder = new GitBranchFuzzyFinder();
    const result = await _finder.querySelectableOptions();

    expect(result).toEqual([]);
  });

  it("returns only local branches by default", async () => {
    const refs: Ref[] = [
      { name: "main", type: 0, remote: false } as any,
      { name: "origin/dev", type: 1, remote: true } as any,
    ];

    gitApiMock.repositories[0].getRefs.mockResolvedValueOnce(refs);

    const branches = await provider.querySelectableOptions();

    expect(branches).toHaveLength(1);
    expect(branches[0].name).toBe("main");
  });

  it("includes remote branches when includeRemotes is true", async () => {
    const refs: Ref[] = [
      { name: "main", type: 0, remote: false } as any,
      { name: "origin/dev", type: 1, remote: true } as any,
    ];

    gitApiMock.repositories[0].getRefs.mockResolvedValueOnce(refs);

    const _finder = new GitBranchFuzzyFinder({ includeRemotes: true });
    const branches = await _finder.querySelectableOptions();

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

    gitApiMock.repositories[0].log.mockResolvedValue(commits);

    const preview = await provider.getPreviewData("main");

    expect(preview.content).toHaveLength(1);
    expect(preview.content[0].hash).toBe("abc123");
    expect(preview.content[0].message).toBe("initial commit");
  });
});
