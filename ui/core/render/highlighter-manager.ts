import { bundledLanguages, bundledThemes, createHighlighter, type Highlighter } from "shiki/bundle/web";
import { AsyncResult } from "../../../shared/result";

/**
 * Centralized manager for Highlighter lifecycle (Webview / Browser).
 */
export class HighlighterManager {
  private static highlighter: Highlighter | null = null;
  private static loadedThemes = new Set<string>();
  private static loadedLanguages = new Set<string>(["text"]);

  /**
   * Initializes the Shiki highlighter if not already initialized.
   */
  static async init(): Promise<Highlighter> {
    if (this.highlighter) return this.highlighter;

    console.log("[ShikiManager] Initializing Shiki (bundle/web)...");

    this.highlighter = await createHighlighter({
      themes: [],
      langs: [],
    });

    console.log("[ShikiManager] Highlighter ready.");
    return this.highlighter;
  }

  /**
   * Loads a theme definition if it has not been loaded yet.
   * This method is idempotent and safe to call repeatedly.
   */
  static async loadThemeIfNeeded(theme: string): AsyncResult<string> {
    if (this.loadedThemes.has(theme)) {
      return { ok: true, value: theme };
    }

    return await this.loadThemeFromBundle(theme);
  }

  /**
   * Loads a language definition if it has not been loaded yet.
   * This method is idempotent and safe to call repeatedly.
   */
  static async loadLanguageIfNeeded(lang: string): AsyncResult<string> {
    if (this.loadedLanguages.has(lang)) {
      return { ok: true, value: lang };
    }

    return await this.loadLanguageFromBundle(lang);
  }

  /**
   * Loads a theme from Shiki bundled themes.
   */
  private static async loadThemeFromBundle(theme: string): AsyncResult<string> {
    const def = bundledThemes[theme];

    if (!def) {
      return {
        ok: false,
        error: `[ShikiManager] Theme not found in bundle/web: ${theme}`,
      };
    }

    try {
      await this.highlighter!.loadTheme(def);
      this.loadedThemes.add(theme);

      console.log(`[ShikiManager] Theme loaded: ${theme}`);

      return {
        ok: true,
        value: theme,
      };
    } catch (err) {
      return {
        ok: false,
        error: `[ShikiManager] Failed to load theme '${theme}': ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Loads a language grammar from Shiki bundled languages.
   */
  private static async loadLanguageFromBundle(lang: string): AsyncResult<string> {
    const def = bundledLanguages[lang];

    if (!def) {
      return {
        ok: false,
        error: `[ShikiManager] Language not found in bundle/web: ${lang}`,
      };
    }

    try {
      await this.highlighter!.loadLanguage(def);
      this.loadedLanguages.add(lang);

      console.log(`[ShikiManager] Language loaded: ${lang}`);

      return {
        ok: true,
        value: lang,
      };
    } catch (err) {
      return {
        ok: false,
        error: `[ShikiManager] Failed to load language '${lang}': ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
