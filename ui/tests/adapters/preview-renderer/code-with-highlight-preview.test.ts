import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodeWithHighlightPreviewRendererAdapter } from "../../../core/adapters/preview-renderer/code-with-highlight-preview.renderer-adapter";
import { WebviewToExtensionMessenger } from "../../../core/common/wv-to-extension-messenger";

vi.mock("@ui/utils/html", () => ({
  toInnerHTML: vi.fn((text: string) => `escaped:${text}`),
}));

vi.mock("@ui/core/common/wv-to-extension-messenger", () => ({
  WebviewToExtensionMessenger: {
    instance: {
      requestHighlightCache: vi.fn(),
    },
  },
}));

describe("CodeWithHighlightPreviewRendererAdapter", () => {
  let previewEl: HTMLElement;

  beforeEach(() => {
    previewEl = document.createElement("div");
    vi.clearAllMocks();
  });

  it("renders plain pre block when no highlighter is provided", async () => {
    const adapter = new CodeWithHighlightPreviewRendererAdapter(null as any);

    await adapter.render(
      previewEl,
      {
        content: {
          text: "console.log('hi')",
          path: "/file.ts",
          isCached: false,
        },
      },
      "dark",
    );

    expect(previewEl.innerHTML).toContain("<pre");
    expect(previewEl.innerHTML).toContain("escaped:console.log('hi')");
  });

  it("uses syntax highlighter when available", async () => {
    const highlighter = {
      codeToHtml: vi.fn().mockReturnValue("<pre><code>highlighted</code></pre>"),
    };

    const adapter = new CodeWithHighlightPreviewRendererAdapter(highlighter as any);

    await adapter.render(
      previewEl,
      {
        content: {
          text: "code",
          path: "/file.ts",
          isCached: false,
        },
        language: "ts",
      },
      "dark",
    );

    expect(highlighter.codeToHtml).toHaveBeenCalledWith("code", {
      lang: "ts",
      theme: "dark",
    });

    expect(previewEl.innerHTML).toContain("highlighted");
  });

  it("adds highlighted line when metadata.highlightLine is provided", async () => {
    const htmlWithLines = `
      <pre class="shiki">
        <span class="line">a</span>
        <span class="line">b</span>
        <span class="line">c</span>
      </pre>
    `;

    const highlighter = {
      codeToHtml: vi.fn().mockReturnValue(htmlWithLines),
    };

    const adapter = new CodeWithHighlightPreviewRendererAdapter(highlighter as any);

    await adapter.render(
      previewEl,
      {
        content: {
          text: "code",
          path: "/file.ts",
          isCached: false,
        },
        metadata: {
          highlightLine: 1,
        },
      },
      "dark",
    );

    expect(previewEl.innerHTML).toContain("highlighted");
    expect(WebviewToExtensionMessenger.instance.requestHighlightCache).toHaveBeenCalled();
  });

  it("does not re-highlight or cache when content is cached", async () => {
    const highlighter = {
      codeToHtml: vi.fn(),
    };

    const adapter = new CodeWithHighlightPreviewRendererAdapter(highlighter as any);

    await adapter.render(
      previewEl,
      {
        content: {
          text: "cached",
          path: "/file.ts",
          isCached: true,
        },
      },
      "dark",
    );

    expect(highlighter.codeToHtml).not.toHaveBeenCalled();
    expect(WebviewToExtensionMessenger.instance.requestHighlightCache).not.toHaveBeenCalled();
  });

  it("falls back to plain pre on rendering error", async () => {
    const highlighter = {
      codeToHtml: vi.fn(() => {
        throw new Error("boom");
      }),
    };

    const adapter = new CodeWithHighlightPreviewRendererAdapter(highlighter as any);

    await adapter.render(
      previewEl,
      {
        content: {
          text: "oops",
          path: "/file.ts",
          isCached: false,
        },
      },
      "dark",
    );

    expect(previewEl.innerHTML).toContain("<pre>");
    expect(previewEl.innerHTML).toContain("escaped:oops");
  });
});
