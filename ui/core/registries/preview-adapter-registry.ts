import { createHighlighter } from "shiki";
import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { IPreviewAdapter } from "../abstractions/preview-adapter";
import { BranchPreviewAdapter } from "../preview-adapters/branch-preview.adapter";
import { CodeWithHighlightPreviewAdapter } from "../preview-adapters/code-with-highlight.adapter";

export type SyntaxHighlighter = Awaited<ReturnType<typeof createHighlighter>> | null;

export class PreviewAdapterRegistry {
  private adapters = new Map<string, IPreviewAdapter>();
  private syntaxHighlighter: SyntaxHighlighter = null;

  public async init() {
    console.log("[PreviewAdapterRegistry] Registering adapters...");
    this.register(new BranchPreviewAdapter(null));
    this.register(new CodeWithHighlightPreviewAdapter(null));

    this.initHighlighterAsync();
  }

  register(adapter: IPreviewAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  getAdapter(finderType: PreviewRendererType): IPreviewAdapter | undefined {
    return this.adapters.get(finderType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  private async initHighlighterAsync() {
    if (this.syntaxHighlighter) return;

    console.log("[PreviewAdapterRegistry] Loading syntax highlighter in background...");

    try {
      this.syntaxHighlighter = await createHighlighter({
        themes: ["dark-plus", "github-dark", "github-light", "monokai", "dracula", "tokyo-night", "monokai"],
        langs: ["javascript", "typescript", "python", "json", "markdown", "html", "css", "bash", "yaml", "sql"],
      });

      console.log("[PreviewAdapterRegistry] Syntax highlighter loaded!");

      this.updateAdaptersWithHighlighter();
    } catch (error) {
      console.error("[PreviewAdapterRegistry] Failed to load highlighter:", error);
    }
  }

  private updateAdaptersWithHighlighter() {
    for (const adapter of this.adapters.values()) {
      if ("setHighlighter" in adapter && typeof adapter.setHighlighter === "function") {
        (adapter as any).setHighlighter(this.syntaxHighlighter);
      }
    }
    console.log("[PreviewAdapterRegistry] Adapters updated with highlighter");
  }
}
