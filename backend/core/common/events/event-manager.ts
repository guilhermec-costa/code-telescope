import path from "path";
import * as vscode from "vscode";
import extToLangMap from "../../../config/highlight-langs.json";
import { Globals } from "../../../globals";
import { getShikiTheme } from "../../../utils/shiki";
import { WorkspaceFileFinder } from "../../finders/ws-files.finder";
import { FuzzyFinderPanelController } from "../../presentation/fuzzy-panel.controller";
import { FileContentCache } from "../cache/file-content.cache";
import { HighlightContentCache } from "../cache/highlight-content.cache";
import { CONFIG_CHANGE_HANDLERS } from ".";

export class EventManager {
  private static instance: EventManager;

  private constructor() {
    this.registerConfigListener();
    this.registerFileListener();
  }

  static init() {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  private registerConfigListener() {
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      for (const handler of CONFIG_CHANGE_HANDLERS) {
        if (event.affectsConfiguration(handler.section)) {
          await handler.handle(event);
        }
      }
    });
  }

  private registerFileListener() {
    vscode.workspace.onDidSaveTextDocument((e) => {
      HighlightContentCache.instance.invalidateByFilePrefix(e.fileName);
      FileContentCache.instance.invalidate(e.fileName);
    });
  }

  static async emitInitialEvents() {
    const finder = new WorkspaceFileFinder();
    const files = await finder.getWorkspaceFiles();

    const langs = new Set<string>();

    for (const f of files) {
      const ext = path.extname(f.fsPath).slice(1).toLowerCase();
      const language = (extToLangMap as any)[ext];
      if (language) langs.add(language);
    }

    if (FuzzyFinderPanelController.instance) {
      await FuzzyFinderPanelController.instance.emitInitShikiEvent({
        languages: [...langs, "diff"],
        theme: getShikiTheme(Globals.USER_THEME),
      });
    }
  }
}
