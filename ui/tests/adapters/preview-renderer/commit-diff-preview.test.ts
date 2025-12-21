import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { CommitDiffPreviewRendererAdapter } from "../../../core/adapters/preview-renderer/commit-diff-preview.renderer-adapter";

describe("CommitDiffPreviewRendererAdapter", () => {
  let highlighter: any;
  let adapter: CommitDiffPreviewRendererAdapter;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");

    highlighter = {
      codeToHtml: vi.fn(),
    } as any;

    adapter = new CommitDiffPreviewRendererAdapter(highlighter);
  });

  it("renders highlighted diff into the preview element", async () => {
    const html = "<pre><code>diff content</code></pre>";

    vi.mocked(highlighter.codeToHtml).mockReturnValue(html);

    const data: PreviewData = {
      content: "diff content",
      language: "diff",
    };

    await adapter.render(container, data, "dark");

    expect(highlighter.codeToHtml).toHaveBeenCalledWith("diff content", {
      lang: "diff",
      theme: "dark",
    });

    expect(container.innerHTML).toBe(html);
  });

  it("uses default language 'diff' when none is provided", async () => {
    vi.mocked(highlighter.codeToHtml).mockReturnValue("<pre />");

    const data: PreviewData = {
      content: "some diff",
    };

    await adapter.render(container, data, "light");

    expect(highlighter.codeToHtml).toHaveBeenCalledWith("some diff", {
      lang: "diff",
      theme: "light",
    });
  });

  it("does not throw if highlighter fails", async () => {
    vi.mocked(highlighter.codeToHtml).mockImplementation(() => {
      throw new Error("boom");
    });

    const data: PreviewData = {
      content: "broken diff",
    };

    await expect(adapter.render(container, data, "dark")).resolves.not.toThrow();
    expect(container.innerHTML).toBe("");
  });

  it("clears the preview element", () => {
    container.innerHTML = "<pre>something</pre>";

    adapter.clear(container);

    expect(container.innerHTML).toBe("");
  });

  it("allows replacing the highlighter instance", async () => {
    const newHighlighter = {
      codeToHtml: vi.fn().mockReturnValue("<pre>new</pre>"),
    };

    adapter.setHighlighter(newHighlighter as any);

    const data: PreviewData = {
      content: "content",
    };

    await adapter.render(container, data, "dark");

    expect(newHighlighter.codeToHtml).toHaveBeenCalled();
    expect(container.innerHTML).toBe("<pre>new</pre>");
  });
});
