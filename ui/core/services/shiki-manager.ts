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

    await this.loadThemeFromBundle("dark-plus");
    console.log("[ShikiManager] Highlighter ready.");
    return this.highlighter;
  }

  static async loadThemeFromBundle(themeName: string) {
    const { themes } = await import(`${__SHIKI_EXTENSION_URI__}/shiki-bundle.js`);
    const theme = themes?.bundledThemes?.[themeName];
    if (!theme) throw new Error(`[ShikiManager] Theme not found: ${themeName}`);

    const highlighter = await this.ensureHighlighter();
    await highlighter.loadTheme(theme);
    console.log(`[ShikiManager] Theme loaded from bundle: ${themeName}`);
  }

  static async loadLanguageFromBundle(langName: string) {
    const { langs } = await import(`${__SHIKI_EXTENSION_URI__}/shiki-bundle.js`);
    const lang = langs?.bundledLanguages?.[langName];
    if (!lang) throw new Error(`[ShikiManager] Language not found: ${langName}`);

    const highlighter = await this.ensureHighlighter();
    await highlighter.loadLanguage(lang);
    console.log(`[ShikiManager] Language loaded from bundle: ${langName}`);
  }
}
