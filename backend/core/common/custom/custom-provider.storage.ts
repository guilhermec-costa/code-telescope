import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { Result } from "../../../@types/result";
import { Globals } from "../../../globals";
import { CustomFinderBackendProxy } from "../../finders/custom/backend-proxy.finder";
import { CustomFinderUiProxy } from "../../finders/custom/ui-proxy.finder";

export class CustomProviderStorage {
  private static _instance: CustomProviderStorage;
  private providers: Map<string, CustomFinderDefinition> = new Map();

  private constructor() {}

  static get instance(): CustomProviderStorage {
    if (!this._instance) this._instance = new CustomProviderStorage();
    return this._instance;
  }

  registerConfig(config: CustomFinderDefinition): Result<null> {
    const prefix = Globals.CUSTOM_PROVIDER_PREFIX;

    if (!config.fuzzyAdapterType.startsWith(prefix)) {
      return {
        ok: false,
        error: `Invalid fuzzyAdapterType "${config.fuzzyAdapterType}". Custom providers must start with "${prefix}". Example: "${prefix}my.provider"`,
      };
    }

    this.providers.set(config.fuzzyAdapterType, config);
    return { ok: true, value: null };
  }

  deleteConfig(fuzzyType: string): void {
    this.providers.delete(fuzzyType);
  }

  getConfig(fuzzyType: string): CustomFinderDefinition | undefined {
    return this.providers.get(fuzzyType);
  }

  getAllTypes(): string[] {
    return Array.from(this.providers.keys());
  }

  getUiProxyDefinition(fuzzyType: string): Result<CustomFinderUiProxy> {
    const userConfig = this.getConfig(fuzzyType);
    if (!userConfig) {
      return { ok: false, error: "Custom finder configuration not found" };
    }

    return CustomFinderUiProxy.create(userConfig);
  }

  getBackendProxyDefinition(fuzzyType: string): Result<CustomFinderBackendProxy> {
    const userConfig = this.getConfig(fuzzyType);
    if (!userConfig) {
      return { ok: false, error: "Custom finder configuration not found" };
    }

    return CustomFinderBackendProxy.create(userConfig);
  }
}
