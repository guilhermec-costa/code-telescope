import * as vscode from "vscode";
import { CustomFuzzyProviderType, FuzzyProviderType } from "../../../shared/adapters-namespace";
import { Logger } from "../../core/log";
import { FuzzyFinderPanelController } from "../../core/presentation/fuzzy-panel.controller";
import { FuzzyFinderAdapterRegistry } from "../../core/registry/fuzzy-provider.registry";
import { Globals } from "../../globals";
import { CodeTelescopeAPI, FinderRegistration } from "./api";
import { ExternalFinderRegistry } from "./external-registry";

export function createCodeTelescopeAPI(): CodeTelescopeAPI {
  return {
    version: "1.0.0",
    registerFinder<TData, TOption>(registration: FinderRegistration<TData, TOption>): vscode.Disposable {
      const { provider } = registration;
      const type = provider.fuzzyAdapterType;

      if (!type.startsWith(Globals.EXTERNAL_PROVIDER_PREFIX)) {
        throw new Error(`[CodeTelescope] External finders must use the "ext.*" namespace. Got: "${type}"`);
      }

      if (ExternalFinderRegistry.instance.has(type)) {
        throw new Error(`[CodeTelescope] A finder with type "${type}" is already registered.`);
      }

      FuzzyFinderAdapterRegistry.instance.register(provider);
      ExternalFinderRegistry.instance.register(registration);

      Logger.info(`[CodeTelescope] External finder registered: ${type}`);

      return new vscode.Disposable(() => {
        FuzzyFinderAdapterRegistry.instance.deleteAdapter(type);
        ExternalFinderRegistry.instance.delete(type);
        Logger.info(`[CodeTelescope] External finder unregistered: ${type}`);
      });
    },

    async openFinder(type: FuzzyProviderType | CustomFuzzyProviderType | string): Promise<void> {
      await FuzzyFinderPanelController.setupProvider(type as any);
    },

    getRegisteredFinders(): string[] {
      return FuzzyFinderAdapterRegistry.instance.getRegisteredTypes();
    },

    getCustomFinders(): string[] {
      return FuzzyFinderAdapterRegistry.instance.getCustomTypes();
    },

    getExternalFinders(): string[] {
      return ExternalFinderRegistry.instance.getExternalTypes();
    },

    hasFinder(type: string): boolean {
      return FuzzyFinderAdapterRegistry.instance.getAdapter(type as any) !== undefined;
    },

    unregisterFinder(type: string): void {
      const isBuiltin =
        !type.startsWith(Globals.CUSTOM_PROVIDER_PREFIX) && !type.startsWith(Globals.EXTERNAL_PROVIDER_PREFIX);

      if (isBuiltin) {
        Logger.warn(`[CodeTelescope] Cannot unregister built-in finder: ${type}`);
        return;
      }

      FuzzyFinderAdapterRegistry.instance.deleteAdapter(type);
      ExternalFinderRegistry.instance.delete(type);
    },
  };
}
