import * as vscode from "vscode";
import { CustomFuzzyProviderType } from "../shared/adapters-namespace";
import { CustomProviderLoader } from "./core/common/custom/custom-provider.loader";
import { CustomProviderStorage } from "./core/common/custom/custom-provider.storage";
import { loadFuzzyProviders } from "./core/finders/loader";
import { FuzzyFinderPanelController } from "./core/presentation/fuzzy-panel.controller";
import { loadWebviewHandlers } from "./core/presentation/handlers/loader";
import { Globals } from "./globals";
import { registerProviderCmd } from "./utils/commands";
import { getConfigurationSection } from "./utils/configuration";

let customProviderLoader: CustomProviderLoader;
/**
 * code-telescope activation entrypoint
 */
export async function activate(ctx: vscode.ExtensionContext) {
  console.log(`${Globals.EXTENSION_NAME} activated!`);
  Globals.EXTENSION_URI = ctx.extensionUri;
  Globals.USER_THEME = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");

  loadFuzzyProviders();
  loadWebviewHandlers();

  customProviderLoader = new CustomProviderLoader(ctx);
  await customProviderLoader.initialize();

  registerProviderCmd("file", () => FuzzyFinderPanelController.setupProvider("workspace.files"), ctx);
  registerProviderCmd("keybindings", () => FuzzyFinderPanelController.setupProvider("workspace.keybindings"), ctx);
  registerProviderCmd("branch", () => FuzzyFinderPanelController.setupProvider("git.branches"), ctx);
  registerProviderCmd("wsText", () => FuzzyFinderPanelController.setupProvider("workspace.text"), ctx);
  registerProviderCmd("commits", () => FuzzyFinderPanelController.setupProvider("git.commits"), ctx);
  registerProviderCmd(
    "custom",
    async () => {
      const customTypes = CustomProviderStorage.instance.getAllTypes();
      if (customTypes.length === 0) {
        vscode.window.showInformationMessage("No custom finders found in .vscode/code-telescope/");
        return;
      }
      const selected = await vscode.window.showQuickPick(customTypes, { placeHolder: "Select a custom provider" });
      if (selected) await FuzzyFinderPanelController.setupProvider(selected as CustomFuzzyProviderType);
    },
    ctx,
  );
}

export function deactivate() {
  customProviderLoader.dispose();
  console.log("code-telescope deactivated");
}
