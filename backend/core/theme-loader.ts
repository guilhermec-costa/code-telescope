import * as fs from "fs/promises";
import { parse as parseJsonc } from "jsonc-parser";
import * as path from "path";
import * as vscode from "vscode";

export interface ThemeInfo {
  name: string;
  type: "dark" | "light";
  jsonData: any;
}

export class ThemeLoader {
  private static cache: Map<string, any> = new Map();

  static async getCurrentThemeData(): Promise<ThemeInfo> {
    const themeName = vscode.workspace.getConfiguration("workbench").get<string>("colorTheme");
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
          const themeJson = parseJsonc(content);

          themeJson.name = themeName;
          themeJson.type = type;

          if (themeName) this.cache.set(themeName, themeJson);

          return { name: themeName || "custom", type, jsonData: themeJson };
        } catch (e) {
          console.error(`Erro ao carregar tema ${themeName}:`, e);
        }
      }
    }

    return { name: "fallback", type, jsonData: null };
  }
}
