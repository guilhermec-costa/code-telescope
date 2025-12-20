import { expect, type Mocked, vi } from "vitest";
import * as vscode from "vscode";
import { FileContentCache } from "../../../core/common/cache/file-content.cache";
import { HighlightContentCache } from "../../../core/common/cache/highlight-content.cache";
import { WorkspaceTextSearchProvider } from "../../../core/finders/ws-text-finder";
import { RegexFinder } from "../../../core/finders/ws-text-finder/regex-finder";
import { RipgrepFinder } from "../../../core/finders/ws-text-finder/ripgrep-finder";

vi.mock("../../../core/common/cache/file-content.cache", () => ({
  FileContentCache: {
    instance: {
      get: vi.fn(),
    },
  },
}));

vi.mock("../../../core/common/cache/highlight-content.cache", () => ({
  HighlightContentCache: {
    instance: {
      get: vi.fn(),
    },
  },
}));

vi.mock("../../../core/finders/ws-text-finder/regex-finder", () => {
  const RegexFinder = vi.fn(
    class MockClass {
      search = vi.fn();
    },
  );
  return { RegexFinder };
});

vi.mock("../../../core/finders/ws-text-finder/ripgrep-finder", () => {
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

  it("returns html load config", () => {
    const cfg = provider.getHtmlLoadConfig();

    expect(cfg.fileName).toBe("file-fuzzy.view.html");
    expect(cfg.placeholders["{{style}}"]).toBe("ui/style/style.css");
    expect(cfg.placeholders["{{script}}"]).toBe("ui/dist/index.js");
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

    expect(rgInstance.search).toHaveBeenCalledWith("test");
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

  it("returns cached highlighted preview when available", async () => {
    vi.mocked(HighlightContentCache.instance.get).mockReturnValueOnce("cached content");

    const preview = await provider.getPreviewData("/tmp/file.ts:2");

    expect(preview.content.isCached).toBe(true);
    expect(preview.content.text).toBe("cached content");
    expect(preview.metadata?.highlightLine).toBe(1);
  });

  it("loads file content when highlight cache is empty", async () => {
    vi.mocked(HighlightContentCache.instance.get).mockReturnValueOnce(undefined);
    vi.mocked(FileContentCache.instance.get).mockResolvedValueOnce("line1\nline2\nline3");

    const preview = await provider.getPreviewData("/tmp/file.ts:2");

    expect(preview.content.isCached).toBe(false);
    expect(preview.metadata?.totalLines).toBe(3);
  });

  it("returns error preview when file loading fails", async () => {
    vi.mocked(HighlightContentCache.instance.get).mockReturnValueOnce(undefined);
    vi.mocked(FileContentCache.instance.get).mockRejectedValueOnce(new Error("fail"));

    const preview = await provider.getPreviewData("/tmp/file.ts");

    expect(preview.content.text).toBe("Error loading file");
    expect(preview.language).toBe("text");
  });

  it("opens file and reveals position on select", async () => {
    await provider.onSelect("/tmp/file.ts:3:5");

    expect(vscode.window.showTextDocument).toHaveBeenCalled();
  });
});
