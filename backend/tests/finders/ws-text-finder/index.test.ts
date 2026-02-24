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
    provider = new WorkspaceTextSearchProvider();
  });

  it("returns initial selectable options", async () => {
    const result = await provider.querySelectableOptions();
    expect(result).toEqual([]);
  });

  it("uses ripgrep when available", async () => {
    const rgInstance = vi.mocked(RipgrepTextFinder).mock.results[0].value as Mocked<RipgrepTextFinder>;

    rgInstance.search.mockResolvedValueOnce({ results: ["match"] } as any);

    const result = await provider.searchOnDynamicMode("test");

    expect(rgInstance.search).toHaveBeenCalledWith("test", undefined);
    expect(result.results).toEqual(["match"]);
  });

  it("falls back to regex finder when ripgrep fails", async () => {
    const rgInstance = vi.mocked(RipgrepTextFinder).mock.results[0].value as Mocked<RipgrepTextFinder>;
    const regexInstance = vi.mocked(RegexFinder).mock.results[0].value as Mocked<RegexFinder>;

    rgInstance.search.mockRejectedValueOnce(new Error("rg error"));
    regexInstance.search.mockResolvedValueOnce({ results: ["fallback"] });

    const result = await provider.searchOnDynamicMode("test");

    expect(regexInstance.search).toHaveBeenCalledWith("test");
    expect(result.results).toEqual(["fallback"]);
  });

  it("opens file and reveals position on select", async () => {
    await provider.onSelect("/tmp/file.ts:3:5");

    expect(vscode.window.showTextDocument).toHaveBeenCalled();
  });
});
