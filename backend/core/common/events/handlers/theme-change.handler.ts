import * as vscode from "vscode";
import { Globals } from "../../../../globals";
import { getConfigurationSection } from "../../../../utils/configuration";
import { getShikiTheme } from "../../../../utils/shiki";
import { ConfigChangeHandler } from "../../../abstractions/config-change-handler";
import { FuzzyFinderPanelController } from "../../../presentation/fuzzy-panel.controller";
import { HighlightContentCache } from "../../cache/highlight-content.cache";

export class ThemeChangeHandler implements ConfigChangeHandler {
  readonly section = Globals.cfgSections.colorTheme;

  async handle(_: vscode.ConfigurationChangeEvent): Promise<void> {
    const newTheme = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");

    Globals.USER_THEME = newTheme;
    HighlightContentCache.instance.clear();

    if (FuzzyFinderPanelController.instance) {
      await FuzzyFinderPanelController.instance.emitThemeUpdateEvent(getShikiTheme(newTheme));
    }

    console.log(`[Shiki] Theme updated: ${newTheme}`);
  }
}
