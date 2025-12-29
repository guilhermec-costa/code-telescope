import path from "path";
import * as vscode from "vscode";
import extToLangMap from "../../config/highlight-langs.json";
import { Globals } from "../../globals";
import { getConfigurationSection } from "../../utils/configuration";
import { getShikiTheme } from "../../utils/shiki.js";
import { WorkspaceFileFinder } from "../finders/ws-files.finder";
import { FuzzyFinderPanelController } from "../presentation/fuzzy-panel.controller";
import { FileContentCache } from "./cache/file-content.cache";
import { HighlightContentCache } from "./cache/highlight-content.cache";

export class VSCodeEventsManager {
  private static instance: VSCodeEventsManager;
  private loadedLangs: Set<string> = new Set();

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
    const finder = new WorkspaceFileFinder();
    const files = await finder.getWorkspaceFiles();

    const langsToLoad = files.reduce<Set<string>>((langs, f) => {
      const ext = path.extname(f.fsPath).slice(1).toLowerCase();
      const language = ext && (extToLangMap as any)[ext];

      if (language) {
        langs.add(language);
        this.instance.loadedLangs.add(language);
      }
      return langs;
    }, new Set<string>());

    console.log("[FuzzyPanel] Languages detected:", langsToLoad);

    if (FuzzyFinderPanelController.instance) {
      await FuzzyFinderPanelController.instance.emitInitShikiEvent({
        languages: [...langsToLoad, "diff", "python", "sql"],
        theme: getShikiTheme(Globals.USER_THEME),
      });
    }
  }
}
