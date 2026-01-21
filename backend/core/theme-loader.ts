import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";

export interface ThemeInfo {
  name: string;
  type: "dark" | "light";
  jsonData: any;
}

export class ThemeLoader {
  private static cache: Map<string, any> = new Map();

  static async getCurrentThemeData(targetTheme?: string): Promise<ThemeInfo> {
    const themeName = targetTheme || vscode.workspace.getConfiguration("workbench").get<string>("colorTheme");
    const activeTheme = vscode.window.activeColorTheme;
    const type =
      activeTheme.kind === vscode.ColorThemeKind.Dark || activeTheme.kind === vscode.ColorThemeKind.HighContrast
        ? "dark"
        : "light";

    if (themeName && this.cache.has(themeName)) {
      return { name: themeName, type, jsonData: this.cache.get(themeName) };
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

          if (themeName) this.cache.set(themeName, themeJson);

          return { name: themeName || "custom", type, jsonData: themeJson };
        } catch (e) {
          console.error(`Erro ao carregar tema ${themeName}:`, e);
        }
      }
    }

    // 3. Fallback para temas nativos
    return { name: "fallback", type, jsonData: null };
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
