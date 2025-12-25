import { CustomFinderDefinition } from "../../../shared/custom-provider";
import { CustomFinderBackendProxy } from "../finders/custom/backend-proxy.finder";
import { CustomFinderUiProxy } from "../finders/custom/ui-proxy.finder";

export interface SerializedUiConfig {
  fuzzyAdapterType: CustomFinderDefinition["fuzzyAdapterType"];
  previewAdapterType: CustomFinderDefinition["previewAdapterType"];
  dataAdapter: {
    parseOptions: string;
    getDisplayText: string;
    getSelectionValue: string;
    filterOption?: string;
  };
}

export class CustomProviderManager {
  private static _instance: CustomProviderManager;
  private providers: Map<string, CustomFinderDefinition> = new Map();

  private constructor() {}

  static get instance(): CustomProviderManager {
    if (!this._instance) this._instance = new CustomProviderManager();
    return this._instance;
  }

  registerConfig(config: CustomFinderDefinition) {
    this.providers.set(config.fuzzyAdapterType, config);
  }

  getConfig(fuzzyType: string): CustomFinderDefinition | undefined {
    return this.providers.get(fuzzyType);
  }

  getAllTypes(): string[] {
    return Array.from(this.providers.keys());
  }

  getUiProxyDefinition(fuzzyType: string): { ok: true; value: CustomFinderUiProxy } | { ok: false; error: string } {
    const userConfig = this.getConfig(fuzzyType);
    if (!userConfig) {
      return { ok: false, error: "Custom finder configuration not found" };
    }

    return CustomFinderUiProxy.create(userConfig);
  }

  getBackendProxyDefinition(
    fuzzyType: string,
  ): { ok: true; value: CustomFinderBackendProxy } | { ok: false; error: string } {
    const userConfig = this.getConfig(fuzzyType);
    if (!userConfig) {
      return { ok: false, error: "Custom finder configuration not found" };
    }

    return CustomFinderBackendProxy.create(userConfig);
  }
}
