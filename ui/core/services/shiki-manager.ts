import type { HighlighterCore } from "shiki/core";

declare const __SHIKI_EXTENSION_URI__: string;

export class ShikiManager {
  private static highlighter: HighlighterCore | null = null;

  static async ensureHighlighter(): Promise<HighlighterCore> {
    if (this.highlighter) return this.highlighter;

    console.log("[ShikiManager] Initializing Shiki...");

    const shikiBundle = await import(`${__SHIKI_EXTENSION_URI__}/shiki-bundle.js`);

    const { createHighlighterCore, createOnigurumaEngine, wasm } = shikiBundle;

    this.highlighter = await createHighlighterCore({
      engine: createOnigurumaEngine(wasm),
    });

    console.log("[ShikiManager] Highlighter ready.");
    return this.highlighter;
  }

  static async loadTheme(themeModulePath: string) {
    const highlighter = await this.ensureHighlighter();
    await highlighter.loadTheme(import(themeModulePath));
    console.log(`[ShikiManager] Theme loaded: ${themeModulePath}`);
  }

  static async loadLanguage(langModulePath: string) {
    const highlighter = await this.ensureHighlighter();
    await highlighter.loadLanguage(import(langModulePath));
    console.log(`[ShikiManager] Language loaded: ${langModulePath}`);
  }
}
