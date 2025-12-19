import path from "path";
import * as vscode from "vscode";
import { Globals } from "../../globals";
import { getConfigurationSection } from "../../utils/configuration";
import { getShikiLanguage, getShikiTheme } from "../../utils/shiki";
import { FuzzyFinderPanelController } from "../presentation/fuzzy-panel.controller";
import { FileContentCache } from "./cache/file-content.cache";
import { HighlightContentCache } from "./cache/highlight-content.cache";

export class VSCodeEventsManager {
  private static instance: VSCodeEventsManager;

  private constructor() {
    this.handleThemeChanges();
    this.handleFileChanges();
  }

  static init() {
    if (!VSCodeEventsManager.instance) {
      VSCodeEventsManager.instance = new VSCodeEventsManager();
    }
    return VSCodeEventsManager.instance;
  }

  private handleThemeChanges() {
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (!e.affectsConfiguration(Globals.cfgSections.colorTheme)) return;

      const newTheme = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");
      Globals.USER_THEME = newTheme;
      HighlightContentCache.instance.clear();

      try {
        if (FuzzyFinderPanelController.instance) {
          await FuzzyFinderPanelController.instance.emitThemeUpdateEvent(newTheme);
        }
        console.log(`[Shiki] Loaded theme: ${newTheme}`);
      } catch (err) {
        console.error(`Failed to load theme ${newTheme}`, err);
      }
    });
  }

  private handleFileChanges() {
    vscode.workspace.onDidSaveTextDocument((e) => {
      HighlightContentCache.instance.invalidateByFilePrefix(e.fileName);
      FileContentCache.instance.invalidate(e.fileName);
    });
  }

  static async emitInitialEvents() {
    const extToLanguage: Record<string, string> = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      json: "json",
      html: "html",
      css: "css",
      scss: "scss",
      md: "markdown",
      py: "python",
      java: "java",
      go: "go",
      rs: "rust",
      c: "c",
      h: "c",
      cpp: "cpp",
      hpp: "cpp",
      cs: "csharp",
      yml: "yaml",
      yaml: "yaml",
      sql: "sql",
      xml: "xml",
    };

    const files = await vscode.workspace.findFiles("**/*.*", "**/node_modules/**");
    const extensions = new Set<string>();

    for (const f of files) {
      const ext = path.extname(f.fsPath).slice(1);
      if (ext) extensions.add(ext.toLowerCase());
    }

    const languagesToLoad = Array.from(extensions)
      .map((ext) => extToLanguage[ext])
      .filter(Boolean);

    console.log("[FuzzyPanel] Languages detected:", languagesToLoad);

    if (FuzzyFinderPanelController.instance) {
      await FuzzyFinderPanelController.instance.emitInitShikiEvent({
        languages: [...languagesToLoad.map((l) => getShikiLanguage(l)), "diff"],
        theme: getShikiTheme(Globals.USER_THEME),
      });
    }
  }
}
