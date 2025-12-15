import * as vscode from "vscode";
import { loadFuzzyProviders } from "./core/finders/loader";
import { FuzzyFinderPanelController } from "./core/presentation/fuzzy-panel.controller";
import { loadWebviewHandlers } from "./core/presentation/handlers/loader";
import { Globals } from "./globals";
import { getCmdId, registerAndSubscribeCmd } from "./utils/commands";
import { getConfigurationSection } from "./utils/configuration";

/**
 * code-telescope activation entrypoint
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log(`${Globals.EXTENSION_NAME} activated!`);
  Globals.EXTENSION_URI = context.extensionUri;
  Globals.USER_THEME = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");

  loadFuzzyProviders();
  loadWebviewHandlers();

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "file"),
    async () => {
      const instance = FuzzyFinderPanelController.createOrShow();
      await instance.startProvider("workspace.files");
    },
    context,
  );
  registerAndSubscribeCmd(
    getCmdId("fuzzy", "branch"),
    async () => {
      const instance = FuzzyFinderPanelController.createOrShow();
      await instance.startProvider("git.branches");
    },
    context,
  );
  registerAndSubscribeCmd(
    getCmdId("fuzzy", "wsText"),
    async () => {
      const instance = FuzzyFinderPanelController.createOrShow();
      await instance.startProvider("workspace.text");
    },
    context,
  );
  registerAndSubscribeCmd(
    getCmdId("fuzzy", "commits"),
    async () => {
      const instance = FuzzyFinderPanelController.createOrShow();
      await instance.startProvider("git.commits");
    },
    context,
  );
}

export function deactivate() {
  console.log("code-telescope deactivated");
}
