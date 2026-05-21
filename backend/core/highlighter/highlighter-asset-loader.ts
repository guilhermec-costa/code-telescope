import * as path from "path";
import * as vscode from "vscode";
import type { LanguageGrammar, ThemeGrammar } from "../../../shared/extension-webview-protocol";
import { JsoncParser } from "../common/jsonc-parser";
import { ExtensionRootsResolver } from "./extension-roots-resolver";
import { HostDetector } from "./remote-detector";

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

    for (const ext of vscode.extensions.all) {
      const themes = ext.packageJSON.contributes?.themes;
      if (!themes) continue;

      const matchedTheme = themes.find((t: any) => t.label === themeName || t.id === themeName);
      if (!matchedTheme) continue;

      try {
        const themeUri = vscode.Uri.joinPath(ext.extensionUri, matchedTheme.path);
        const contentBytes = await vscode.workspace.fs.readFile(themeUri);
        const parsedTheme = JsoncParser.parse(new TextDecoder().decode(contentBytes));
        const themeJson = await this.resolveThemeRecursively(themeUri.fsPath, parsedTheme);

        themeJson.name = themeName;
        themeJson.type = type;

        if (themeName) this.themeCache.set(themeName, themeJson);
        return { name: themeName || "custom", type, jsonData: themeJson };
      } catch (e) {
        console.error(`Error loading theme ${themeName}:`, e);
      }
    }

    return this.findThemeGrammarInRoots(themeName, type, this.getRootsForEnvironment());
  }

  static async getLanguageGrammar(langId: string): Promise<LanguageGrammar | null> {
    if (this.langCache.has(langId)) {
      return this.langCache.get(langId)!;
    }

    for (const ext of vscode.extensions.all) {
      const grammars = ext.packageJSON.contributes?.grammars;
      if (!grammars) continue;

      const matchedGrammar = grammars.find((g: any) => g.language === langId);
      if (!matchedGrammar) continue;

      const isDerivative = matchedGrammar.scopeName?.includes("derivative");
      const finalGrammar = isDerivative
        ? (grammars.find((g: any) => g.scopeName?.includes(langId)) ?? matchedGrammar)
        : matchedGrammar;

      try {
        const grammarUri = vscode.Uri.joinPath(ext.extensionUri, finalGrammar.path);
        const contentBytes = await vscode.workspace.fs.readFile(grammarUri);
        const grammarJson = JsoncParser.parse(new TextDecoder().decode(contentBytes));

        const supportGrammars: { scopeName: string; grammar: any }[] = [];
        for (const g of grammars) {
          if (g.language || g === finalGrammar) continue;
          try {
            const uri = vscode.Uri.joinPath(ext.extensionUri, g.path);
            const bytes = await vscode.workspace.fs.readFile(uri);
            const grammar = JsoncParser.parse(new TextDecoder().decode(bytes));
            supportGrammars.push({ scopeName: g.scopeName, grammar });
          } catch (e) {
            console.error(`[LanguageLoader] Error loading support grammar ${g.scopeName}:`, e);
          }
        }

        const langInfo: LanguageGrammar = {
          id: langId,
          scopeName: finalGrammar.scopeName || grammarJson.scopeName,
          grammar: grammarJson,
          embeddedLangs: finalGrammar.embeddedLanguages,
          supportGrammars: supportGrammars.length > 0 ? supportGrammars : undefined,
        };

        this.langCache.set(langId, langInfo);
        return langInfo;
      } catch (e) {
        console.error(`[LanguageLoader] Error loading grammar for ${langId}:`, e);
      }
    }

    return this.findLanguageGrammarInRoots(langId, this.getRootsForEnvironment());
  }

  private static getRootsForEnvironment(): string[] {
    switch (HostDetector.detect()) {
      case "wsl":
        return ExtensionRootsResolver.getWslRoots();
      case "devcontainer":
        return ExtensionRootsResolver.getDevcontainerRoots();
      case "local":
      default:
        return [];
    }
  }

  private static async findInExtensionRoots<T>(
    roots: string[],
    matcher: (pkg: any, extDir: string) => Promise<T | null>,
  ): Promise<T | null> {
    for (const root of roots) {
      const rootUri = vscode.Uri.file(root);
      let entries: [string, vscode.FileType][];
      try {
        entries = await vscode.workspace.fs.readDirectory(rootUri);
      } catch {
        continue;
      }

      for (const [entry, fileType] of entries) {
        if (fileType !== vscode.FileType.Directory) continue;

        const extDir = path.join(root, entry);
        const pkgPath = path.join(extDir, "package.json");
        const pkgUri = vscode.Uri.file(pkgPath);

        let pkg: any;
        try {
          pkg = await this.readJsonFromUri(pkgUri);
        } catch {
          continue;
        }

        const result = await matcher(pkg, extDir);
        if (result !== null) return result;
      }
    }

    return null;
  }

  private static async findThemeGrammarInRoots(
    themeName: string | undefined,
    type: "dark" | "light",
    roots: string[],
  ): Promise<ThemeGrammar | null> {
    if (!themeName || roots.length === 0) return null;

    return this.findInExtensionRoots(roots, async (pkg, extDir) => {
      const themes = pkg.contributes?.themes;
      if (!themes) return null;

      const matchedTheme = themes.find((t: any) => t.label === themeName || t.id === themeName);
      if (!matchedTheme) return null;

      try {
        const themePath = path.join(extDir, matchedTheme.path);
        const parsedTheme = await this.readJsoncFromUri(vscode.Uri.file(themePath));
        const themeJson = await this.resolveThemeRecursively(themePath, parsedTheme);

        themeJson.name = themeName;
        themeJson.type = type;

        this.themeCache.set(themeName, themeJson);
        return { name: themeName, type, jsonData: themeJson } as ThemeGrammar;
      } catch (e) {
        console.error(`[ThemeLoader] Error reading theme grammar at ${extDir}:`, e);
        return null;
      }
    });
  }

  private static async findLanguageGrammarInRoots(langId: string, roots: string[]): Promise<LanguageGrammar | null> {
    if (roots.length === 0) return null;

    return this.findInExtensionRoots(roots, async (pkg, extDir) => {
      const grammars = pkg.contributes?.grammars;
      if (!grammars) return null;

      const matchedGrammar = grammars.find((g: any) => g.language === langId);
      if (!matchedGrammar) return null;

      try {
        const grammarJson = await this.readJsoncFromUri(vscode.Uri.file(path.join(extDir, matchedGrammar.path)));

        const langInfo: LanguageGrammar = {
          id: langId,
          scopeName: matchedGrammar.scopeName || grammarJson.scopeName,
          grammar: grammarJson,
          embeddedLangs: matchedGrammar.embeddedLanguages,
        };

        this.langCache.set(langId, langInfo);
        return langInfo;
      } catch (e) {
        console.error(`[LanguageLoader] Error reading language grammar at ${extDir}:`, e);
        return null;
      }
    });
  }

  private static async resolveThemeRecursively(
    currentThemePath: string,
    currentThemeJson: any,
    visited: Set<string> = new Set(),
  ): Promise<any> {
    if (visited.has(currentThemePath)) return currentThemeJson;
    visited.add(currentThemePath);

    const includePath = currentThemeJson?.include;
    if (!includePath || typeof includePath !== "string") {
      return currentThemeJson;
    }

    const includeFullPath = path.resolve(path.dirname(currentThemePath), includePath);
    const includeParsed = await this.readJsoncFromUri(vscode.Uri.file(includeFullPath));
    const includeResolved = await this.resolveThemeRecursively(includeFullPath, includeParsed, visited);

    return this.mergeThemeJson(includeResolved, currentThemeJson);
  }

  private static async readJsoncFromUri(uri: vscode.Uri) {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return JsoncParser.parse(new TextDecoder().decode(bytes));
  }

  private static async readJsonFromUri(uri: vscode.Uri): Promise<any> {
    const bytes = await vscode.workspace.fs.readFile(uri);
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  private static mergeThemeJson(baseTheme: any, currentTheme: any): any {
    const mergeObject = (key: string) => ({
      ...(baseTheme?.[key] ?? {}),
      ...(currentTheme?.[key] ?? {}),
    });

    const mergeArray = (key: string) => [
      ...(Array.isArray(baseTheme?.[key]) ? baseTheme[key] : []),
      ...(Array.isArray(currentTheme?.[key]) ? currentTheme[key] : []),
    ];

    const merged = {
      ...baseTheme,
      ...currentTheme,
      colors: mergeObject("colors"),
      semanticTokenColors: mergeObject("semanticTokenColors"),
      tokenColors: mergeArray("tokenColors"),
    };

    delete merged.include;

    return merged;
  }
}
