import * as vscode from "vscode";
import { CustomFuzzyProviderType } from "../shared/adapters-namespace";
import { CustomProviderLoader } from "./core/common/custom/custom-provider.loader";
import { CustomProviderStorage } from "./core/common/custom/custom-provider.storage";
import { PreContextManager } from "./core/common/pre-context";
import "./core/decorators/loader";
import { HarpoonProvider } from "./core/finders/harpoon.finder";
import { Logger } from "./core/log";
import { FuzzyFinderPanelController } from "./core/presentation/fuzzy-panel.controller";
import { Globals } from "./globals";
import { registerHarpoonCmds } from "./harpoon/commands";
import { HarpoonOrchestrator } from "./harpoon/orchestrator";
import { PerformanceDevModule } from "./perf/perf-dev.module";
import { registerProviderCmd } from "./utils/commands";
import { getConfigurationSection } from "./utils/configuration";

let customProviderLoader: CustomProviderLoader;

/**
 * code-telescope activation entrypoint
 */
export async function activate(ctx: vscode.ExtensionContext) {
  Globals.ENV = ctx.extensionMode;
  if (ctx.extensionMode === vscode.ExtensionMode.Development) {
    PerformanceDevModule.activate(ctx);
    Logger.info("[DEV MODE] Performance debugging enabled");
  }

  Globals.EXTENSION_URI = ctx.extensionUri;
  Globals.USER_THEME = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");

  customProviderLoader = new CustomProviderLoader(ctx);
  await customProviderLoader.initialize();

  vscode.window.onDidChangeActiveTextEditor((ed) => {
    PreContextManager.instance.captureFromActiveEditor();
  });

  registerProviderCmd("file", () => FuzzyFinderPanelController.setupProvider("workspace.files"), ctx);
  registerProviderCmd("keybindings", () => FuzzyFinderPanelController.setupProvider("workspace.keybindings"), ctx);
  registerProviderCmd("branch", () => FuzzyFinderPanelController.setupProvider("git.branches"), ctx);
  registerProviderCmd("wsText", () => FuzzyFinderPanelController.setupProvider("workspace.text"), ctx);
  registerProviderCmd("wsSymbols", () => FuzzyFinderPanelController.setupProvider("workspace.symbols"), ctx);
  registerProviderCmd("recentFiles", () => FuzzyFinderPanelController.setupProvider("workspace.recentFiles"), ctx);
  registerProviderCmd("colorschemes", () => FuzzyFinderPanelController.setupProvider("workspace.colorschemes"), ctx);
  registerProviderCmd("diagnostics", () => FuzzyFinderPanelController.setupProvider("workspace.diagnostics"), ctx);
  registerProviderCmd("tasks", () => FuzzyFinderPanelController.setupProvider("workspace.tasks"), ctx);
  registerProviderCmd("harpoon", () => FuzzyFinderPanelController.setupProvider("harpoon.marks"), ctx);
  registerProviderCmd("callHierarchy", () => FuzzyFinderPanelController.setupProvider("workspace.callHierarchy"), ctx);
  registerProviderCmd("breakpoints", () => FuzzyFinderPanelController.setupProvider("debug.breakpoints"), ctx);
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

  HarpoonProvider.initialize(ctx);
  const manager = HarpoonOrchestrator.getInstance(ctx);
  registerHarpoonCmds(manager, ctx);

  Logger.info(`${Globals.EXTENSION_NAME} activated!`);

  // for integration tests
  return ctx;
}

export function deactivate() {
  customProviderLoader.dispose();
  console.log("code-telescope deactivated");
}
