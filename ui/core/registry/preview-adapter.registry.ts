import type { HighlighterCore } from "shiki/core";
import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { getRegisteredPreviewRendererAdapters } from "../decorators/preview-renderer-adapter.decorator";
import { withPerformanceLogging } from "../perf";
import { HighlighterManager } from "../render/highlighter-manager";

export type SyntaxHighlighter = HighlighterCore | null;

export class PreviewRendererAdapterRegistry {
  private adapters = new Map<string, IPreviewRendererAdapter>();

  /** Shared syntax highlighter instance */
  private syntaxHighlighter: SyntaxHighlighter = null;

  private static _instance: PreviewRendererAdapterRegistry | undefined;

  private constructor() {}

  static get instance() {
    if (this._instance) return this._instance;

    this._instance = new PreviewRendererAdapterRegistry();
    return this._instance;
  }

  async init() {
    console.log("[PreviewAdapterRegistry] Registering adapters...");
    for (const adapter of getRegisteredPreviewRendererAdapters()) {
      this.register(adapter);
    }

    await this.initAdapterHighlighters();
  }

  register(adapter: IPreviewRendererAdapter): void {
    const wrappedProvider = withPerformanceLogging(adapter);
    this.adapters.set(adapter.type, wrappedProvider);
  }

  getAdapter(type: PreviewRendererType): IPreviewRendererAdapter | undefined {
    return this.adapters.get(type);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Lazily initializes the syntax highlighter and injects it
   * into adapters that support highlighting.
   */
  private async initAdapterHighlighters() {
    if (this.syntaxHighlighter) return;

    console.log("[PreviewAdapterRegistry] Loading syntax highlighter in background...");

    try {
      this.syntaxHighlighter = await HighlighterManager.initHighlighterCore();
      for (const adapter of this.adapters.values()) {
        if ("setHighlighter" in adapter && typeof adapter.setHighlighter === "function") {
          adapter.setHighlighter(this.syntaxHighlighter);
        }
      }
    } catch (err) {
      console.error("[PreviewAdapterRegistry] Failed to initialize highlighter:", err);
    }
  }
}
