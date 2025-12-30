import type { HighlighterCore } from "shiki/core";
import { AsyncResult } from "../../../shared/result";

/**
 * Centralized manager for Highlighter lifecycle.
 */
export class HighlighterManager {
  private static highlighter: HighlighterCore | null = null;
  private static loadedThemes = new Set<string>();
  private static loadedLanguages = new Set<string>();
  private static bundlePromise: Promise<any> | null = null;

  static async initHighlighterCore(): Promise<HighlighterCore> {
    if (this.highlighter) return this.highlighter;

    console.log("[ShikiManager] Initializing Shiki...");

    const shikiBundle = await import(`${__SHIKI_URI__}/shiki-bundle.js`);

    const { createHighlighterCore, createOnigurumaEngine, wasm } = shikiBundle;

    this.highlighter = await createHighlighterCore({
      engine: createOnigurumaEngine(wasm),
    });

    console.log("[ShikiManager] Highlighter ready.");
    return this.highlighter;
  }

  /**
   * Loads the Shiki bundle dynamically. Ensures the bundle is imported only once, even when multiple
   * concurrent requests are made.
   */
  private static loadBundle() {
    if (!this.bundlePromise) {
      this.bundlePromise = import(`${__SHIKI_URI__}/shiki-bundle.js`);
    }
    return this.bundlePromise;
  }

  /**
   * Loads a language definition if it has not been loaded yet.
   * This method is idempotent and safe to call repeatedly.
   */
  static async loadLanguageIfNedeed(language: string): AsyncResult<string> {
    if (this.loadedLanguages.has(language)) {
      return { ok: true, value: language };
    }
    return await this.loadLanguageFromBundle(language);
  }

  /**
   * Loads a theme from the bundled Shiki themes.
   *
   * @throws Error if the theme is not found in the bundle
   */
  static async loadThemeFromBundle(theme: string) {
    if (this.loadedThemes.has(theme)) return;

    const { themes } = await this.loadBundle();
    const bundledTheme = themes?.bundledThemes?.[theme];
    if (!bundledTheme) throw new Error(`[ShikiManager] Theme not found: ${theme}`);

    await this.highlighter.loadTheme(bundledTheme);
    this.loadedThemes.add(theme);
    console.log(`[ShikiManager] Theme loaded from bundle: ${theme}`);
  }

  /**
   * Loads a language grammar from the bundled Shiki languages.
   *
   * @throws Error if the language is not found in the bundle
   */
  static async loadLanguageFromBundle(lang: string): AsyncResult<string> {
    if (this.loadedLanguages.has(lang)) return { ok: true, value: lang };

    const { langs } = await this.loadBundle();
    const bundledLang = langs?.bundledLanguages?.[lang];
    if (!bundledLang) {
      return {
        ok: false,
        error: `[ShikiManager] Language not found: ${lang}`,
      };
    }

    await this.highlighter.loadLanguage(bundledLang);
    this.loadedLanguages.add(lang);
    console.log(`[ShikiManager] Language loaded from bundle: ${lang}`);

    return {
      ok: true,
      value: lang,
    };
  }
}
