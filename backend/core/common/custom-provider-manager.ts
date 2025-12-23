import { CustomFinderDefinition } from "../../../shared/custom-provider";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";

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

  getUiSerializedConfig(fuzzyType: string) {
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

  getBackendSerializedConfig(fuzzyType: string): IFuzzyFinderProvider | null {
    const userConfig = this.getConfig(fuzzyType);
    if (!userConfig) return null;

    return {
      fuzzyAdapterType: userConfig.fuzzyAdapterType as any,
      previewAdapterType: userConfig.previewAdapterType as any,
      querySelectableOptions: () => userConfig.backend.querySelectableOptions(),
      onSelect: (item) => userConfig.backend.onSelect(item),
      getHtmlLoadConfig: () => userConfig.backend.getHtmlLoadConfig(),
      getPreviewData: async (id) => {
        const data = await userConfig.backend.getPreviewData(id);
        return { content: data };
      },
    };
  }
}
