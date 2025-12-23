import * as vscode from "vscode";
import { CustomFinderDefinition } from "../shared/custom-provider";
import { CustomProviderManager } from "./core/common/custom-provider-manager";
import { loadFuzzyProviders } from "./core/finders/loader";
import { FuzzyFinderPanelController } from "./core/presentation/fuzzy-panel.controller";
import { loadWebviewHandlers } from "./core/presentation/handlers/loader";
import { FuzzyFinderAdapterRegistry } from "./core/registry/fuzzy-provider.registry";
import { Globals } from "./globals";
import { getCmdId, registerAndSubscribeCmd } from "./utils/commands";
import { getConfigurationSection } from "./utils/configuration";

/**
 * code-telescope activation entrypoint
 */
export async function activate(ctx: vscode.ExtensionContext) {
  console.log(`${Globals.EXTENSION_NAME} activated!`);
  Globals.EXTENSION_URI = ctx.extensionUri;
  Globals.USER_THEME = getConfigurationSection(Globals.cfgSections.colorTheme, "Default Dark+");

  loadFuzzyProviders();
  loadWebviewHandlers();
  setupCustomProviders(ctx);

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "file"),
    async () => {
      const instance = FuzzyFinderPanelController.createOrShow();
      await instance.startProvider("workspace.files");
    },
    ctx,
  );
  registerAndSubscribeCmd(
    getCmdId("fuzzy", "branch"),
    async () => {
      const instance = FuzzyFinderPanelController.createOrShow();
      await instance.startProvider("git.branches");
    },
    ctx,
  );
  registerAndSubscribeCmd(
    getCmdId("fuzzy", "wsText"),
    async () => {
      const instance = FuzzyFinderPanelController.createOrShow();
      await instance.startProvider("workspace.text");
    },
    ctx,
  );
  registerAndSubscribeCmd(
    getCmdId("fuzzy", "commits"),
    async () => {
      const instance = FuzzyFinderPanelController.createOrShow();
      await instance.startProvider("git.commits");
    },
    ctx,
  );
  registerAndSubscribeCmd(
    getCmdId("fuzzy", "custom"),
    async () => {
      const customTypes = CustomProviderManager.instance.getAllTypes();
      if (customTypes.length === 0) {
        vscode.window.showInformationMessage("No custom finders found in .vscode/code-telescope/");
        return;
      }
      const selected = await vscode.window.showQuickPick(customTypes, { placeHolder: "Select a custom provider" });
      if (selected) {
        const instance = FuzzyFinderPanelController.createOrShow();
        await instance.startProvider(selected as any);
      }
    },
    ctx,
  );
}

export function deactivate() {
  console.log("code-telescope deactivated");
}

async function setupCustomProviders(context: vscode.ExtensionContext) {
  const customProviderFiles = await vscode.workspace.findFiles(".vscode/code-telescope/*.finder.cjs");

  for (const fileUri of customProviderFiles) {
    try {
      const filePath = fileUri.fsPath;
      delete require.cache[require.resolve(filePath)];
      const module = await import(filePath);
      const userConfig: CustomFinderDefinition = module.default || module;

      CustomProviderManager.instance.registerConfig(userConfig);

      const dynamicProvider = CustomProviderManager.instance.getBackendProxyDefinition(userConfig.fuzzyAdapterType);
      if (!dynamicProvider) continue;

      FuzzyFinderAdapterRegistry.instance.register(dynamicProvider);

      registerAndSubscribeCmd(
        getCmdId("fuzzy", userConfig.fuzzyAdapterType),
        async () => {
          const instance = FuzzyFinderPanelController.createOrShow();
          await instance.startProvider(userConfig.fuzzyAdapterType as any);
        },
        context,
      );
    } catch (err) {
      console.error(`Failed to load custom finder: ${fileUri.fsPath}`, err);
    }
  }
}
