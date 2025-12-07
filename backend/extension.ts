import * as vscode from "vscode";
import { GitBranchFuzzyFinder } from "./finders/git-branch.finder";
import { WorkspaceFileFinder } from "./finders/workspace-files.finder";
import { WorkspaceTextSearchProvider } from "./finders/workspace-text.finder";
import { FuzzyPanelController } from "./fuzzy/fuzzy-panel.controller";
import { Globals } from "./globals";
import { getCmdId, registerAndSubscribeCmd } from "./utils/commands";
import { getConfigurationSection } from "./utils/configuration";
import { getShikiTheme } from "./utils/shiki";

/**
 * code-telescope activation entrypoint
 */
export function activate(context: vscode.ExtensionContext) {
  console.log(`${Globals.EXTENSION_NAME} activated!`);
  Globals.EXTENSION_URI = context.extensionUri;
  Globals.USER_THEME = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(Globals.cfgSections.colorTheme)) {
      const newTheme = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");
      Globals.USER_THEME = getShikiTheme(newTheme);
      console.log(`The color theme changed to: ${Globals.USER_THEME}`);
      const fuzzyPanel = FuzzyPanelController.fuzzyControllerSingleton;
      if (!fuzzyPanel) return;
      fuzzyPanel.sendThemeUpdateEvent(Globals.USER_THEME);
    }
  });

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "file"),
    async () => {
      const fuzzyPanel = FuzzyPanelController.createOrShow();
      fuzzyPanel.setFuzzyProvider(new WorkspaceFileFinder(fuzzyPanel.wvPanel));
    },
    context,
  );

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "branch"),
    async () => {
      const fuzzyPanel = FuzzyPanelController.createOrShow();
      fuzzyPanel.setFuzzyProvider(new GitBranchFuzzyFinder(fuzzyPanel.wvPanel, { includeRemotes: true }));
    },
    context,
  );

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "wsText"),
    async () => {
      const fuzzyPanel = FuzzyPanelController.createOrShow();
      fuzzyPanel.setFuzzyProvider(new WorkspaceTextSearchProvider(fuzzyPanel.wvPanel));
    },
    context,
  );
}

export function deactivate() {
  console.log("code-telescope deactivated");
}
