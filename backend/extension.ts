import * as vscode from "vscode";
import { VSCodeGitBranchFinder } from "./finders/vscode-git-branch.finder";
import { WorkspaceFileFinder } from "./finders/workspace-files.finder";
import { WorkspaceTextSearchProvider } from "./finders/workspace-text.finder";
import { FuzzyPanel } from "./fuzzy/fuzzy-panel";
import { Globals } from "./globals";
import { getShikiTheme } from "./syntax-highlight/shiki-utils";
import type { ExtensionCtx } from "./types";
import { getCmdId, registerAndSubscribeCmd } from "./utils/commands";
import { getConfigurationSection } from "./utils/configuration";

export function activate(context: ExtensionCtx) {
  console.log(`${Globals.EXTENSION_NAME} activated!`);
  Globals.EXTENSION_URI = context.extensionUri;
  Globals.USER_THEME = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(Globals.cfgSections.colorTheme)) {
      const newTheme = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");
      Globals.USER_THEME = getShikiTheme(newTheme);
      console.log(`The color theme changed to: ${Globals.USER_THEME}`);
      const fuzzyPanel = FuzzyPanel.currentPanel;
      if (!fuzzyPanel) return;
      fuzzyPanel.emitThemeChangeEvent(Globals.USER_THEME);
    }
  });

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "file"),
    async () => {
      const fuzzyPanel = FuzzyPanel.createOrShow();
      fuzzyPanel.setProvider(new WorkspaceFileFinder(fuzzyPanel.panel));
    },
    context,
  );

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "branch"),
    async () => {
      const fuzzyPanel = FuzzyPanel.createOrShow();
      fuzzyPanel.setProvider(new VSCodeGitBranchFinder(fuzzyPanel.panel, { includeRemotes: true }));
    },
    context,
  );

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "wsText"),
    async () => {
      const fuzzyPanel = FuzzyPanel.createOrShow();
      fuzzyPanel.setProvider(new WorkspaceTextSearchProvider(fuzzyPanel.panel));
    },
    context,
  );
}

export function deactivate() {
  console.log("code-telescope deactivated");
}
