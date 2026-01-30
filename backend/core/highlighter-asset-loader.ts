import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { LanguageGrammar, ThemeGrammar } from "../../shared/extension-webview-protocol";

export class HighlighterAssetLoader {
  private static themeCache: Map<string, ThemeGrammar> = new Map();
  private static langCache: Map<string, LanguageGrammar> = new Map();

  static async getThemeGrammar(targetTheme?: string): Promise<ThemeGrammar | null> {
    const themeName = targetTheme || vscode.workspace.getConfiguration("workbench").get<string>("colorTheme");
    const activeTheme = vscode.window.activeColorTheme;
    const type =
      activeTheme.kind === vscode.ColorThemeKind.Dark || activeTheme.kind === vscode.ColorThemeKind.HighContrast
        ? "dark"
        : "light";

    if (themeName && this.themeCache.has(themeName)) {
      return { name: themeName, type, jsonData: this.themeCache.get(themeName) };
    }

    const extensions = vscode.extensions.all;

    for (const ext of extensions) {
      const themes = ext.packageJSON.contributes?.themes;
      if (!themes) continue;

      const matchedTheme = themes.find((t: any) => t.label === themeName || t.id === themeName);

      if (matchedTheme) {
        try {
          const themePath = path.join(ext.extensionPath, matchedTheme.path);
          const content = await fs.readFile(themePath, "utf-8");

          const themeJson = this.parseJsonc(content);

          themeJson.name = themeName;
          themeJson.type = type;

          if (themeName) this.langCache.set(themeName, themeJson);

          return { name: themeName || "custom", type, jsonData: themeJson };
        } catch (e) {
          console.error(`Erro ao carregar tema ${themeName}:`, e);
        }
      }
    }

    return null;
  }

  static async getLanguageGrammar(langId: string): Promise<LanguageGrammar | null> {
    if (this.langCache.has(langId)) {
      return this.langCache.get(langId)!;
    }

    const extensions = vscode.extensions.all;

    for (const ext of extensions) {
      const grammars = ext.packageJSON.contributes?.grammars;
      if (!grammars) continue;

      const matchedGrammar = grammars.find((g: any) => g.language === langId);

      if (matchedGrammar) {
        try {
          const grammarPath = path.join(ext.extensionPath, matchedGrammar.path);
          const content = await fs.readFile(grammarPath, "utf-8");

          const grammarJson = this.parseJsonc(content);

          const langInfo: LanguageGrammar = {
            id: langId,
            scopeName: matchedGrammar.scopeName || grammarJson.scopeName,
            grammar: grammarJson,
            embeddedLangs: matchedGrammar.embeddedLanguages,
          };

          this.langCache.set(langId, langInfo);
          return langInfo;
        } catch (e) {
          console.error(`[LanguageLoader] Error loading grammar for ${langId}:`, e);
        }
      }
    }

    return null;
  }

  /**
   * Parses JSON with comments (JSONC format)
   * Removes single-line (//) and multi-line (/* *\/) comments
   */
  private static parseJsonc(text: string): any {
    // Remove single-line comments
    let cleaned = text.replace(/\/\/.*$/gm, "");

    // Remove multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove trailing commas
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      return this.parseJsoncAggressive(text);
    }
  }

  private static parseJsoncAggressive(text: string): any {
    let result = text;

    // State machine for proper comment removal
    let inString = false;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    let output = "";
    let escapeNext = false;

    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      const nextChar = result[i + 1];

      // Handle escape sequences
      if (escapeNext) {
        if (inString) output += char;
        escapeNext = false;
        continue;
      }

      if (char === "\\" && inString) {
        escapeNext = true;
        output += char;
        continue;
      }

      // handle strings
      if (char === '"' && !inSingleLineComment && !inMultiLineComment) {
        inString = !inString;
        output += char;
        continue;
      }

      // skip if inside string
      if (inString) {
        output += char;
        continue;
      }

      // handle comments
      if (!inSingleLineComment && !inMultiLineComment) {
        if (char === "/" && nextChar === "/") {
          inSingleLineComment = true;
          i++; // Skip next char
          continue;
        }

        if (char === "/" && nextChar === "*") {
          inMultiLineComment = true;
          i++; // Skip next char
          continue;
        }
      }

      // end single-line comment
      if (inSingleLineComment && (char === "\n" || char === "\r")) {
        inSingleLineComment = false;
        output += char; // keep the newline
        continue;
      }

      // end multi-line comment
      if (inMultiLineComment && char === "*" && nextChar === "/") {
        inMultiLineComment = false;
        i++;
        continue;
      }

      // add character if not in comment
      if (!inSingleLineComment && !inMultiLineComment) {
        output += char;
      }
    }

    // Remove trailing commas
    output = output.replace(/,(\s*[}\]])/g, "$1");

    return JSON.parse(output);
  }
}
