import type { HighlighterCore } from "shiki/core";
import { LanguageGrammar, ThemeGrammar } from "../../../shared/extension-webview-protocol";
import { AsyncResult } from "../../../shared/result";

/**
 * Centralized manager for Highlighter lifecycle (Webview / Browser).
 */
export class HighlighterManager {
  private static highlighter: HighlighterCore | null = null;
  private static loadedThemes = new Set<string>();
  private static loadedLanguages = new Set<string>(["text"]);
  private static initPromise: Promise<HighlighterCore> | null = null;

  /**
   * Initializes the Shiki highlighter if not already initialized.
   */
  static async initHighlighterCore(): Promise<HighlighterCore> {
    if (this.highlighter) return this.highlighter;
    if (this.initPromise) {
      return this.initPromise;
    }

    console.log("[ShikiManager] Initializing Shiki Core");

    this.initPromise = (async () => {
      const { createHighlighterCore } = await import("shiki/core");
      const { createOnigurumaEngine } = await import("shiki/engine-oniguruma.mjs");
      const wasm = await import("shiki/wasm");

      this.highlighter = await createHighlighterCore({
        engine: createOnigurumaEngine(wasm.default),
        themes: [],
        langs: [],
      });

      console.log("[HighlighterManager] Highlighter ready.");
      return this.highlighter;
    })();

    return this.initPromise;
  }

  /**
   * Loads a theme definition if it has not been loaded yet.
   * This method is idempotent and safe to call repeatedly.
   */
  static async loadThemeIfNeeded(theme: ThemeGrammar): AsyncResult<ThemeGrammar> {
    if (this.loadedThemes.has(theme.name)) {
      return { ok: true, value: theme };
    }

    await this.initHighlighterCore();
    return await this.loadThemeFromGrammar(theme);
  }

  /**
   * Loads a language definition if it has not been loaded yet.
   * This method is idempotent and safe to call repeatedly.
   */
  static async loadLanguageIfNeeded(lang: LanguageGrammar): AsyncResult<LanguageGrammar> {
    console.log(`[HighlighterManager] loadLanguageIfNeeded called for: ${lang.id}`);

    if (this.loadedLanguages.has(lang.id)) {
      console.log(`[HighlighterManager] Language ${lang.id} already loaded, returning cached`);
      return { ok: true, value: lang };
    }

    console.log(`[HighlighterManager] Language ${lang.id} not loaded, initializing highlighter...`);
    await this.initHighlighterCore();
    console.log(`[HighlighterManager] Highlighter initialized, loading language from grammar...`);
    return await this.loadLangFromGrammar(lang);
  }

  /**
   * Loads a theme from grammar definition.
   */
  private static async loadThemeFromGrammar(grammar: ThemeGrammar): AsyncResult<ThemeGrammar> {
    try {
      await this.highlighter.loadTheme(grammar.jsonData);
      this.loadedThemes.add(grammar.name);
      console.log(`[ShikiManager] Theme loaded: ${grammar.name}`);
      return {
        ok: true,
        value: grammar,
      };
    } catch (err) {
      return {
        ok: false,
        error: `[ShikiManager] Failed to load theme '${grammar.name}': ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Loads a language grammar from grammar definition.
   */
  private static async loadLangFromGrammar(lang: LanguageGrammar): AsyncResult<LanguageGrammar> {
    try {
      console.log(`[HighlighterManager] Loading language ${lang.id} with scopeName: ${lang.scopeName}`);

      await this.highlighter.loadLanguage({
        name: lang.grammar.name,
        scopeName: lang.scopeName,
        ...lang.grammar,
      });

      this.loadedLanguages.add(lang.id);
      console.log(`[HighlighterManager] Language loaded successfully: ${lang.id} (registered as ${lang.grammar.name})`);

      return {
        ok: true,
        value: lang,
      };
    } catch (err) {
      console.error(`[HighlighterManager] Error loading language ${lang.id}:`, err);
      return {
        ok: false,
        error: `[ShikiManager] Failed to load language '${lang.id}': ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
