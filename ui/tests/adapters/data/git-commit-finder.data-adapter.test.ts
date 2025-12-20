import { describe, expect, it } from "vitest";
import { CommitData, GitCommitFinderDataAdapter } from "../../../core/adapters/data/git-commit-finder.data-adapter";

describe("GitCommitFinderDataAdapter", () => {
  const adapter = new GitCommitFinderDataAdapter();

  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const data: CommitData = {
    commits: [
      {
        hash: "abcdef1234567890",
        message: "Initial commit",
        fullMessage: "Initial commit\n\nSetup project",
        author: "Alice",
        authorEmail: "alice@test.com",
        date: fiveMinutesAgo,
        parents: [],
      },
      {
        hash: "1234567890abcdef",
        message: "Add feature X",
        fullMessage: "Add feature X\n\nDetails...",
        author: "Bob",
        authorEmail: "bob@test.com",
        date: twoHoursAgo,
        parents: ["abcdef1234567890"],
      },
      {
        hash: "deadbeefdeadbeef",
        message: "Fix bug",
        fullMessage: "Fix bug\n\nCritical fix",
        author: "Carol",
        authorEmail: "carol@test.com",
        date: twoDaysAgo,
        parents: ["1234567890abcdef"],
      },
    ],
  };

  it("returns commits array on parseOptions", () => {
    const options = adapter.parseOptions(data);

    expect(options).toBe(data.commits);
    expect(options).toHaveLength(3);
  });

  it("formats display text with short hash, message, author and relative date", () => {
    const text = adapter.getDisplayText(data.commits[0]);

    expect(text.startsWith("abcdef1")).toBe(true);
    expect(text).toContain("Initial commit");
    expect(text).toContain("Alice");
    expect(text).toContain("ago");
  });

  it("returns commit hash as selection value", () => {
    const value = adapter.getSelectionValue(data.commits[1]);

    expect(value).toBe("1234567890abcdef");
  });

  it("filters by hash", () => {
    const result = adapter.filterOption(data.commits[2], "deadbee");

    expect(result).toBe(true);
  });

  it("filters by commit message", () => {
    const result = adapter.filterOption(data.commits[1], "feature");

    expect(result).toBe(true);
  });

  it("filters by author", () => {
    const result = adapter.filterOption(data.commits[0], "alice");

    expect(result).toBe(true);
  });

  it("returns false when query does not match any field", () => {
    const result = adapter.filterOption(data.commits[0], "nonexistent");

    expect(result).toBe(false);
  });
});
