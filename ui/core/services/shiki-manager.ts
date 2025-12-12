import type { HighlighterCore } from "shiki/core";

declare const __SHIKI_EXTENSION_URI__: string;

export class ShikiManager {
  private static highlighter: HighlighterCore | null = null;
  private static langs: Record<string, any> | null = null;
  private static themes: Record<string, any> | null = null;

  static async ensureHighlighter(): Promise<HighlighterCore> {
    if (this.highlighter) return this.highlighter;

    console.log("[ShikiManager] Initializing Shiki...");

    const shikiBundle = await import(`${__SHIKI_EXTENSION_URI__}/shiki-bundle.js`);

    const { createHighlighterCore, createOnigurumaEngine, wasm, langs, themes } = shikiBundle;

    this.langs = langs;
    this.themes = themes;

    this.highlighter = await createHighlighterCore({
      engine: createOnigurumaEngine(wasm),
    });

    await this.loadThemeFromBundle("dark-plus");
    console.log("[ShikiManager] Highlighter ready.");
    return this.highlighter;
  }

  static async loadThemeFromBundle(themeName: keyof typeof ShikiManager.themes) {
    const highlighter = await this.ensureHighlighter();
    const theme = this.themes?.bundledThemes?.[themeName];
    if (!theme) throw new Error(`[ShikiManager] Theme not found: ${themeName}`);
    await highlighter.loadTheme(theme);
    console.log(`[ShikiManager] Theme loaded from bundle: ${themeName}`);
  }

  static async loadLanguageFromBundle(langName: keyof typeof ShikiManager.langs) {
    const highlighter = await this.ensureHighlighter();
    const lang = this.langs?.bundledLanguages?.[langName];
    if (!lang) throw new Error(`[ShikiManager] Language not found: ${langName}`);
    await highlighter.loadLanguage(lang);
    console.log(`[ShikiManager] Language loaded from bundle: ${langName}`);
  }
}
