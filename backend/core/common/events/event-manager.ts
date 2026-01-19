import * as vscode from "vscode";
import { Globals } from "../../../globals";
import { getShikiTheme } from "../../../utils/shiki";
import { FuzzyFinderPanelController } from "../../presentation/fuzzy-panel.controller";
import { FileContentCache } from "../cache/file-content.cache";
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
      FileContentCache.instance.invalidate(e.fileName);
    });
  }

  static async emitInitialEvents() {
    if (FuzzyFinderPanelController.instance) {
      await FuzzyFinderPanelController.instance.emitInitShikiEvent({
        languages: [],
        theme: getShikiTheme(Globals.USER_THEME),
      });
    }
  }
}
