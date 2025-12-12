import type { HighlighterCore } from "shiki/core";
import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { getRegisteredPreviewRendererAdapters } from "../decorators/preview-renderer-adapter.decorator";
import { ShikiManager } from "../services/shiki-manager";

export type SyntaxHighlighter = HighlighterCore | null;

export class PreviewRendererAdapterRegistry {
  private adapters = new Map<string, IPreviewRendererAdapter>();
  private syntaxHighlighter: SyntaxHighlighter = null;

  async init() {
    console.log("[PreviewAdapterRegistry] Registering adapters...");
    for (const adapter of getRegisteredPreviewRendererAdapters()) {
      this.register(adapter);
    }

    this.lazyInitHighlighter();
  }

  register(adapter: IPreviewRendererAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  getAdapter(type: PreviewRendererType): IPreviewRendererAdapter | undefined {
    return this.adapters.get(type);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  private async lazyInitHighlighter() {
    if (this.syntaxHighlighter) return;

    console.log("[PreviewAdapterRegistry] Loading syntax highlighter in background...");

    try {
      this.syntaxHighlighter = await ShikiManager.ensureHighlighter();
      this.updateAdaptersWithHighlighter();
    } catch (err) {
      console.error("[PreviewAdapterRegistry] Failed to initialize highlighter:", err);
    }
  }

  private updateAdaptersWithHighlighter() {
    for (const adapter of this.adapters.values()) {
      if ("setHighlighter" in adapter && typeof adapter.setHighlighter === "function") {
        adapter.setHighlighter(this.syntaxHighlighter);
      }
    }

    console.log("[PreviewAdapterRegistry] Adapters updated with highlighter");
  }
}
