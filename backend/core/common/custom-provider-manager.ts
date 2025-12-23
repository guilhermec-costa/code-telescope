import { CustomFinderDefinition } from "../../../shared/custom-provider";
import { CustomFinderProxy } from "../finders/custom-proxy.finder";

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

  getUiSerializedConfig(fuzzyType: string): SerializedUiConfig | null {
    const config = this.getConfig(fuzzyType);
    if (!config) return null;

    return {
      fuzzyAdapterType: config.fuzzyAdapterType,
      previewAdapterType: config.previewAdapterType,
      dataAdapter: {
        parseOptions: config.ui.dataAdapter.parseOptions.toString(),
        getDisplayText: config.ui.dataAdapter.getDisplayText.toString(),
        getSelectionValue: config.ui.dataAdapter.getSelectionValue.toString(),
        filterOption: config.ui.dataAdapter.filterOption?.toString(),
      },
    };
  }

  getBackendProxyDefinition(fuzzyType: string): CustomFinderProxy | null {
    const userConfig = this.getConfig(fuzzyType);
    if (!userConfig) return null;
    return new CustomFinderProxy(userConfig);
  }
}
