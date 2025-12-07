import { createHighlighter } from "shiki";
import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { BranchPreviewRendererAdapter } from "../preview-renderer-adapters/branch-preview.renderer-adapter";
import { CodeWithHighlightPreviewRendererAdapter } from "../preview-renderer-adapters/code-with-highlight-preview.renderer-adapter";

export type SyntaxHighlighter = Awaited<ReturnType<typeof createHighlighter>> | null;

/**
 * Registry responsible for managing all PreviewRendererAdapters used by the Webview.
 */
export class PreviewRendererAdapterRegistry {
  private adapters = new Map<string, IPreviewRendererAdapter>();
  private syntaxHighlighter: SyntaxHighlighter = null;

  /**
   * Initializes the registry by registering built-in adapters
   * and triggering the background loading of the syntax highlighter.
   */
  public async init() {
    console.log("[PreviewAdapterRegistry] Registering adapters...");
    this.register(new BranchPreviewRendererAdapter(null));
    this.register(new CodeWithHighlightPreviewRendererAdapter(null));

    this.lazyInitHighlighter();
  }

  /**
   * Registers a preview adapter so it can be retrieved by type later.
   */
  register(adapter: IPreviewRendererAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  getAdapter(finderType: PreviewRendererType): IPreviewRendererAdapter | undefined {
    return this.adapters.get(finderType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Lazily loads the Shiki syntax highlighter in the background.
   * Once loaded, it updates the adapters that support syntax highlighting.
   */
  private async lazyInitHighlighter() {
    if (this.syntaxHighlighter) return;

    console.log("[PreviewAdapterRegistry] Loading syntax highlighter in background...");

    try {
      this.syntaxHighlighter = await createHighlighter({
        themes: [
          "dark-plus",
          "github-dark",
          "github-light",
          "monokai",
          "dracula",
          "tokyo-night",
          "monokai",
          "kanagawa-wave",
        ],
        langs: ["javascript", "typescript", "python", "json", "markdown", "html", "css", "bash", "yaml", "sql"],
      });

      console.log("[PreviewAdapterRegistry] Syntax highlighter loaded!");

      this.updateAdaptersWithHighlighter();
    } catch (error) {
      console.error("[PreviewAdapterRegistry] Failed to load highlighter:", error);
    }
  }

  /**
   * Injects the syntax highlighter into adapters that implement `setHighlighter`.
   */
  private updateAdaptersWithHighlighter() {
    for (const adapter of this.adapters.values()) {
      if ("setHighlighter" in adapter && typeof adapter.setHighlighter === "function") {
        adapter.setHighlighter(this.syntaxHighlighter);
      }
    }
    console.log("[PreviewAdapterRegistry] Adapters updated with highlighter");
  }
}
