import { CustomFinderDefinition } from "../../../shared/custom-provider";

export class CustomProviderManager {
  private static _instance: CustomProviderManager;
  private providers: Map<string, CustomFinderDefinition> = new Map();

  private constructor() {}

  static get instance(): CustomProviderManager {
    if (!this._instance) this._instance = new CustomProviderManager();
    return this._instance;
  }

  registerDefinition(config: CustomFinderDefinition) {
    this.providers.set(config.fuzzy, config);
  }

  getDefinition(fuzzyType: string): CustomFinderDefinition | undefined {
    return this.providers.get(fuzzyType);
  }

  getAllTypes(): string[] {
    return Array.from(this.providers.keys());
  }

  getUiSerializedConfig(fuzzyType: string) {
    const config = this.getDefinition(fuzzyType);
    if (!config) return null;

    return {
      fuzzy: config.fuzzy,
      previewRenderer: config.previewRenderer,
      dataAdapter: {
        parseOptions: config.ui.dataAdapter.parseOptions.toString(),
        getDisplayText: config.ui.dataAdapter.getDisplayText.toString(),
        getSelectionValue: config.ui.dataAdapter.getSelectionValue.toString(),
        filterOption: config.ui.dataAdapter.filterOption?.toString(),
      },
    };
  }
}
