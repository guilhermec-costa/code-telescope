import { getGitRoots } from "@backend/core/finders/git/api-utils";
import { GitCommitFuzzyFinder } from "@backend/core/finders/git/git-commit.finder";
import { execAsync } from "@backend/utils/commands";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { LayoutMode } from "../../../shared/exchange/extension-config";

let layoutMode: LayoutMode = "ivy";

vi.mock("@backend/core/finders/git/api-utils", () => ({
  getGitRoots: vi.fn(),
}));

vi.mock("@backend/utils/commands", () => ({
  execAsync: vi.fn(),
}));

vi.mock("@backend/core/common/config-manager", () => ({
  ExtensionConfigManager: {
    get layoutCfg() {
      return { mode: layoutMode };
    },
  },
}));

describe("GitCommitFuzzyFinder", () => {
  let finder: GitCommitFuzzyFinder;

  beforeEach(() => {
    vi.clearAllMocks();
    layoutMode = "ivy";
    finder = new GitCommitFuzzyFinder();
  });

  it("returns parsed commits for the current branch", async () => {
    vi.mocked(getGitRoots).mockResolvedValueOnce([{ path: "/repo", name: "workspace" }]);
    vi.mocked(execAsync)
      .mockResolvedValueOnce({ stdout: "main", stderr: "" })
      .mockResolvedValueOnce({ stdout: "abc123|first commit|Gui|2024-01-01", stderr: "" });

    const result = await finder.querySelectableOptions();

    expect(result).toEqual([
      {
        hash: "abc123",
        message: "first commit",
        author: "Gui",
        date: "2024-01-01",
        repoName: undefined,
        repoPath: "/repo",
      },
    ]);
  });

  it("reverses commit order in classic layout", async () => {
    layoutMode = "classic";
    vi.mocked(getGitRoots).mockResolvedValueOnce([{ path: "/repo", name: "workspace" }]);
    vi.mocked(execAsync).mockResolvedValueOnce({ stdout: "main", stderr: "" }).mockResolvedValueOnce({
      stdout: "a1|older|Gui|2024-01-01\nb2|newer|Gui|2024-01-02",
      stderr: "",
    });

    const result = await finder.querySelectableOptions();

    expect(result.map((item) => item.hash)).toEqual(["b2", "a1"]);
  });

  it("opens the commit in the remote provider when origin is available", async () => {
    vi.mocked(execAsync).mockResolvedValueOnce({
      stdout: "git@github.com:guilhermec-costa/code-telescope.git",
      stderr: "",
    });

    await finder.onSelect({
      hash: "abc123",
      message: "msg",
      author: "Gui",
      date: "2024-01-01",
      repoName: undefined,
      repoPath: "/repo",
    });

    expect(vscode.env.openExternal).toHaveBeenCalledWith(
      expect.objectContaining({
        fsPath: "https://github.com/guilhermec-costa/code-telescope/commit/abc123",
      }),
    );
  });

  it("falls back to clipboard when remote lookup fails", async () => {
    vi.mocked(execAsync).mockRejectedValueOnce(new Error("no origin"));

    await finder.onSelect({
      hash: "deadbeef",
      message: "msg",
      author: "Gui",
      date: "2024-01-01",
      repoName: undefined,
      repoPath: "/repo",
    });

    expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith("deadbeef");
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Copied deadbeef to clipboard");
  });
});
