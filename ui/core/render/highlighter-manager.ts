import type { HighlighterCore } from "shiki/core";

export class ShikiManager {
  private static highlighter: HighlighterCore | null = null;
  private static loadedThemes = new Set<string>();
  private static loadedLanguages = new Set<string>();

  static async initHighlighterCore(): Promise<HighlighterCore> {
    if (this.highlighter) return this.highlighter;

    console.log("[ShikiManager] Initializing Shiki...");

    const shikiBundle = await import(`${__SHIKI_URI__}/shiki-bundle.js`);

    const { createHighlighterCore, createOnigurumaEngine, wasm } = shikiBundle;

    this.highlighter = await createHighlighterCore({
      engine: createOnigurumaEngine(wasm),
    });

    await Promise.all([this.loadThemeFromBundle("dark-plus")]);
    console.log("[ShikiManager] Highlighter ready.");
    return this.highlighter;
  }

  static async loadThemeFromBundle(theme: string) {
    if (this.loadedThemes.has(theme)) return;

    const { themes } = await import(`${__SHIKI_URI__}/shiki-bundle.js`);
    const bundledTheme = themes?.bundledThemes?.[theme];
    if (!bundledTheme) throw new Error(`[ShikiManager] Theme not found: ${theme}`);

    await this.highlighter.loadTheme(bundledTheme);
    this.loadedThemes.add(theme);
    console.log(`[ShikiManager] Theme loaded from bundle: ${theme}`);
  }

  static async loadLanguageFromBundle(lang: string) {
    if (this.loadedLanguages.has(lang)) return;

    const { langs } = await import(`${__SHIKI_URI__}/shiki-bundle.js`);
    const bundledLang = langs?.bundledLanguages?.[lang];
    if (!lang) throw new Error(`[ShikiManager] Language not found: ${lang}`);

    await this.highlighter.loadLanguage(bundledLang);
    this.loadedLanguages.add(lang);
    console.log(`[ShikiManager] Language loaded from bundle: ${lang}`);
  }
}
