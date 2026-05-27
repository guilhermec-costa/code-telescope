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
import { createCodeTelescopeAPI } from "./integration/api";
import { PerformanceDevModule } from "./perf/perf-dev.module";
import { TelemetryService } from "./telemetry";
import { registerFuzzyFinder } from "./utils/commands";
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

  const telemetry = TelemetryService.instance;
  telemetry.track("extension.activation.started");

  Globals.USER_THEME = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(Globals.cfgSections.colorTheme)) {
      const newTheme = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");
      Globals.USER_THEME = newTheme;
    }
  });

  Globals.EXTENSION_URI = ctx.extensionUri;

  customProviderLoader = new CustomProviderLoader(ctx);
  await customProviderLoader.initialize();

  vscode.window.onDidChangeActiveTextEditor((ed) => {
    PreContextManager.instance.captureFromActiveEditor();
  });

  registerFuzzyFinder("file", () => FuzzyFinderPanelController.setupProvider("workspace.files"), ctx);
  registerFuzzyFinder("keybindings", () => FuzzyFinderPanelController.setupProvider("workspace.keybindings"), ctx);
  registerFuzzyFinder("branch", () => FuzzyFinderPanelController.setupProvider("git.branches"), ctx);
  registerFuzzyFinder("diff", () => FuzzyFinderPanelController.setupProvider("git.diffs"), ctx);
  registerFuzzyFinder("commit", () => FuzzyFinderPanelController.setupProvider("git.commits"), ctx);
  registerFuzzyFinder("stash", () => FuzzyFinderPanelController.setupProvider("git.stashes"), ctx);
  registerFuzzyFinder("wsText", () => FuzzyFinderPanelController.setupProvider("workspace.text"), ctx);
  registerFuzzyFinder("fileText", () => FuzzyFinderPanelController.setupProvider("currentFile.text"), ctx);
  registerFuzzyFinder("wsSymbols", () => FuzzyFinderPanelController.setupProvider("workspace.symbols"), ctx);
  registerFuzzyFinder("recentFiles", () => FuzzyFinderPanelController.setupProvider("workspace.recentFiles"), ctx);
  registerFuzzyFinder("colorschemes", () => FuzzyFinderPanelController.setupProvider("workspace.colorschemes"), ctx);
  registerFuzzyFinder("diagnostics", () => FuzzyFinderPanelController.setupProvider("workspace.diagnostics"), ctx);
  registerFuzzyFinder("tasks", () => FuzzyFinderPanelController.setupProvider("workspace.tasks"), ctx);
  registerFuzzyFinder("harpoon", () => FuzzyFinderPanelController.setupProvider("harpoon.marks"), ctx);
  registerFuzzyFinder("callHierarchy", () => FuzzyFinderPanelController.setupProvider("workspace.callHierarchy"), ctx);
  registerFuzzyFinder("breakpoints", () => FuzzyFinderPanelController.setupProvider("debug.breakpoints"), ctx);
  registerFuzzyFinder("documentSymbols", () => FuzzyFinderPanelController.setupProvider("document.symbols"), ctx);
  registerFuzzyFinder("extensions", () => FuzzyFinderPanelController.setupProvider("workspace.extensions"), ctx);
  registerFuzzyFinder("pkgDocs", () => FuzzyFinderPanelController.setupProvider("workspace.packageDocs"), ctx);
  registerFuzzyFinder("builtin", () => FuzzyFinderPanelController.setupProvider("builtin.finders"), ctx);
  registerFuzzyFinder("resume", () => FuzzyFinderPanelController.resumeLastSession(), ctx);
  registerFuzzyFinder("fontFamily", () => FuzzyFinderPanelController.setupProvider("workspace.fonts"), ctx);
  registerFuzzyFinder("lspRefs", () => FuzzyFinderPanelController.setupProvider("workspace.references"), ctx);
  registerFuzzyFinder(
    "custom",
    async () => {
      const customTypes = CustomProviderStorage.instance.getAllTypes();
      if (customTypes.length === 0) {
        vscode.window.showInformationMessage("No custom finders found in .vscode/code-telescope/");
        telemetry.track("customFinder.empty");
        return;
      }
      const selected = await vscode.window.showQuickPick(customTypes, { placeHolder: "Select a custom provider" });
      if (selected) {
        telemetry.track("customFinder.selected");
        await FuzzyFinderPanelController.setupProvider(selected as CustomFuzzyProviderType);
      }
    },
    ctx,
  );

  HarpoonProvider.initialize(ctx);
  const manager = HarpoonOrchestrator.getInstance(ctx);
  registerHarpoonCmds(manager, ctx);

  Logger.info(`${Globals.EXTENSION_NAME} activated!`);
  return createCodeTelescopeAPI();
}

export async function deactivate() {
  customProviderLoader.dispose();
  await TelemetryService.instance.dispose();
  console.log("code-telescope deactivated");
}
