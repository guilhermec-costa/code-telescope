import { beforeEach, describe, expect, it, type Mocked, vi } from "vitest";
import * as vscode from "vscode";
import { RipgrepTextFinder } from "../../../core/common/rg/rg-text-finder";
import { WorkspaceTextSearchProvider } from "../../../core/finders/ws-text-finder/index.finder";
import { RegexFinder } from "../../../core/finders/ws-text-finder/regex-finder";

vi.mock("@backend/core/common/cache/file-reader", () => ({
  FileReader: {
    read: vi.fn(),
  },
}));

vi.mock("@backend/core/finders/ws-text-finder/regex-finder", () => {
  const RegexFinder = vi.fn(
    class MockClass {
      search = vi.fn();
    },
  );
  return { RegexFinder };
});

vi.mock("@backend/core/common/rg/rg-text-finder", () => {
  const RipgrepTextFinder = vi.fn(
    class MockClass {
      ripgrepAvailable = true;
      search = vi.fn();
    },
  );
  return { RipgrepTextFinder };
});

describe("WorkspaceTextSearchProvider", () => {
  let provider: WorkspaceTextSearchProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.workspace.asRelativePath).mockImplementation((file) =>
      String(file).replace("/home/user/project/", ""),
    );
    provider = new WorkspaceTextSearchProvider();
  });

  it("returns initial selectable options", async () => {
    const result = await provider.querySelectableOptions();
    expect(result).toEqual([]);
  });

  it("uses ripgrep when available", async () => {
    const rgInstance = vi.mocked(RipgrepTextFinder).mock.results[0].value as Mocked<RipgrepTextFinder>;

    rgInstance.search.mockResolvedValueOnce({
      results: [
        {
          file: "/home/user/project/src/index.ts",
          line: 10,
          column: 5,
          text: "const value = 42;",
          preview: "const value = 42;",
        },
      ],
      query: "test",
    });

    const result = await provider.searchOnDynamicMode("test");

    expect(rgInstance.search).toHaveBeenCalledWith("test", undefined);
    expect(result.results[0].relativeFile).toBe("src/index.ts");
  });

  it("falls back to regex finder when ripgrep fails", async () => {
    const rgInstance = vi.mocked(RipgrepTextFinder).mock.results[0].value as Mocked<RipgrepTextFinder>;
    const regexInstance = vi.mocked(RegexFinder).mock.results[0].value as Mocked<RegexFinder>;

    rgInstance.search.mockRejectedValueOnce(new Error("rg error"));
    regexInstance.search.mockResolvedValueOnce({
      results: [
        {
          file: "/home/user/project/src/fallback.ts",
          line: 1,
          column: 1,
          text: "fallback",
          preview: "fallback",
        },
      ],
    });

    const result = await provider.searchOnDynamicMode("test");

    expect(regexInstance.search).toHaveBeenCalledWith("test");
    expect(result.results[0].relativeFile).toBe("src/fallback.ts");
  });

  it("adds relative paths to streamed chunks", () => {
    const result = provider.mapChunk([
      {
        file: "/home/user/project/src/streamed.ts",
        line: 2,
        column: 3,
        text: "streamed",
        preview: "streamed",
      },
    ]);

    expect(result.results[0].relativeFile).toBe("src/streamed.ts");
  });

  it("opens file and reveals position on select", async () => {
    await provider.onSelect("/tmp/file.ts:3:5");

    expect(vscode.window.showTextDocument).toHaveBeenCalled();
  });
});
