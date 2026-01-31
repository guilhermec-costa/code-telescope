import type { HighlighterCore } from "shiki/core";
import { LanguageGrammar, ThemeGrammar } from "../../../shared/extension-webview-protocol";
import { AsyncResult } from "../../../shared/result";
import { MessageBridge } from "../message-bridge";

/**
 * Centralized manager for Highlighter lifecycle (Webview / Browser).
 * Handles on-demand loading of themes and languages via MessageBridge.
 */
export class HighlighterManager {
  private static highlighter: HighlighterCore | null = null;
  private static initPromise: Promise<HighlighterCore> | null = null;

  private static themeMap = new Map<string, ThemeGrammar>();
  private static langMap = new Map<string, LanguageGrammar>();

  private static loadedThemes = new Set<string>();
  private static loadedLanguages = new Set<string>(["text"]);

  /**
   * Initializes the Shiki highlighter core with Oniguruma WASM.
   */
  static async initHighlighterCore(): Promise<HighlighterCore> {
    if (this.highlighter) return this.highlighter;
    if (this.initPromise) return this.initPromise;

    const t0 = performance.now();
    console.log("[HighlighterManager] Initializing Shiki Core...");

    this.initPromise = (async () => {
      const { createHighlighterCore } = await import("shiki/core");
      const { createOnigurumaEngine } = await import("shiki/engine-oniguruma.mjs");
      const wasm = await import("shiki/wasm");

      this.highlighter = await createHighlighterCore({
        engine: createOnigurumaEngine(wasm.default),
        themes: [],
        langs: [],
      });

      const t1 = performance.now();
      console.log(`[HighlighterManager] Shiki Core ready in ${(t1 - t0).toFixed(2)}ms`);
      return this.highlighter;
    })();

    return this.initPromise;
  }

  static async loadThemeIfNeeded(themeName: string): AsyncResult<ThemeGrammar> {
    if (this.loadedThemes.has(themeName) && this.themeMap.has(themeName)) {
      return { ok: true, value: this.themeMap.get(themeName)! };
    }

    const t0 = performance.now();
    await this.initHighlighterCore();

    try {
      console.log(`[HighlighterManager] Requesting theme: ${themeName}`);

      const bridgeStart = performance.now();
      const themeGrammar = await MessageBridge.request<ThemeGrammar>("themeGrammar", themeName);
      const bridgeEnd = performance.now();

      const result = await this.registerTheme(themeGrammar);

      if (result.ok) {
        this.themeMap.set(themeName, themeGrammar);
        console.log(
          `[Performance] Theme "${themeName}" total load: ${(performance.now() - t0).toFixed(2)}ms (Bridge: ${(bridgeEnd - bridgeStart).toFixed(2)}ms)`,
        );
      }
      return result;
    } catch (err) {
      return { ok: false, error: `Bridge request failed: ${String(err)}` };
    }
  }

  static async loadLanguageIfNeeded(langId: string): AsyncResult<LanguageGrammar> {
    if (this.loadedLanguages.has(langId) && this.langMap.has(langId)) {
      return { ok: true, value: this.langMap.get(langId) };
    }

    const t0 = performance.now();
    await this.initHighlighterCore();

    try {
      console.log(`[HighlighterManager] Requesting language: ${langId}`);

      const bridgeStart = performance.now();
      const langGrammar = await MessageBridge.request<LanguageGrammar>("langGrammar", langId);
      const bridgeEnd = performance.now();

      const result = await this.registerLanguage(langGrammar);

      if (result.ok) {
        this.langMap.set(langId, langGrammar);
        console.log(
          `[Performance] Lang "${langId}" total load: ${(performance.now() - t0).toFixed(2)}ms (Bridge: ${(bridgeEnd - bridgeStart).toFixed(2)}ms)`,
        );
      }
      return result;
    } catch (err) {
      return { ok: false, error: `Bridge request failed: ${String(err)}` };
    }
  }

  private static async registerTheme(theme: ThemeGrammar): AsyncResult<ThemeGrammar> {
    const t0 = performance.now();
    try {
      await this.highlighter.loadTheme(theme.jsonData);
      this.loadedThemes.add(theme.name);
      console.log(`[HighlighterManager] Theme registered in ${(performance.now() - t0).toFixed(2)}ms`);
      return { ok: true, value: theme };
    } catch (err) {
      return {
        ok: false,
        error: `[HighlighterManager] Shiki loadTheme error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private static async registerLanguage(lang: LanguageGrammar): AsyncResult<LanguageGrammar> {
    const t0 = performance.now();
    try {
      await this.highlighter.loadLanguage({
        ...lang.grammar,
        name: lang.grammar.name,
        scopeName: lang.scopeName,
      });

      this.loadedLanguages.add(lang.id);
      console.log(`[HighlighterManager] Language registered in ${(performance.now() - t0).toFixed(2)}ms`);
      return { ok: true, value: lang };
    } catch (err) {
      return {
        ok: false,
        error: `[HighlighterManager] Shiki loadLanguage error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  static getHighlighter(): HighlighterCore {
    if (!this.highlighter) throw new Error("Highlighter not initialized");
    return this.highlighter;
  }
}
