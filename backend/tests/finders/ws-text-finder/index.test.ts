import { beforeEach, describe, expect, it, type Mocked, vi } from "vitest";
import * as vscode from "vscode";
import { FileReader } from "../../../core/common/cache/file-reader";
import { WorkspaceTextSearchProvider } from "../../../core/finders/ws-text-finder/index.finder";
import { RegexFinder } from "../../../core/finders/ws-text-finder/regex-finder";
import { RipgrepFinder } from "../../../core/finders/ws-text-finder/ripgrep-finder";

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

vi.mock("@backend/core/finders/ws-text-finder/ripgrep-finder", () => {
  const RipgrepFinder = vi.fn(
    class MockClass {
      ripgrepAvailable = true;
      search = vi.fn();
    },
  );
  return { RipgrepFinder };
});

describe("WorkspaceTextSearchProvider", () => {
  let provider: WorkspaceTextSearchProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new WorkspaceTextSearchProvider();
  });

  it("returns initial selectable options", async () => {
    const result = await provider.querySelectableOptions();

    expect(result.results).toEqual([]);
    expect(result.query).toBe("");
    expect(result.message).toBe("Type to search...");
  });

  it("returns empty results for short query", async () => {
    const result = await provider.searchOnDynamicMode("a");

    expect(result.results).toEqual([]);
    expect(result.query).toBe("a");
  });

  it("uses ripgrep when available", async () => {
    const rgInstance = vi.mocked(RipgrepFinder).mock.results[0].value as Mocked<RipgrepFinder>;

    rgInstance.search.mockResolvedValueOnce({ results: ["match"] });

    const result = await provider.searchOnDynamicMode("test");

    expect(rgInstance.search).toHaveBeenCalledWith("test", undefined);
    expect(result.results).toEqual(["match"]);
  });

  it("falls back to regex finder when ripgrep fails", async () => {
    const rgInstance = vi.mocked(RipgrepFinder).mock.results[0].value as Mocked<RipgrepFinder>;
    const regexInstance = vi.mocked(RegexFinder).mock.results[0].value as Mocked<RegexFinder>;

    rgInstance.search.mockRejectedValueOnce(new Error("rg error"));
    regexInstance.search.mockResolvedValueOnce({ results: ["fallback"] });

    const result = await provider.searchOnDynamicMode("test");

    expect(regexInstance.search).toHaveBeenCalledWith("test");
    expect(result.results).toEqual(["fallback"]);
  });

  it("returns error preview when file loading fails", async () => {
    vi.mocked(FileReader.read).mockRejectedValueOnce(new Error("fail"));

    const preview: any = await provider.getPreviewData("/tmp/file.ts");

    expect(preview.content.text).toBe("Error loading file");
    expect(preview.language).toBe("text");
  });

  it("opens file and reveals position on select", async () => {
    await provider.onSelect("/tmp/file.ts:3:5");

    expect(vscode.window.showTextDocument).toHaveBeenCalled();
  });
});
