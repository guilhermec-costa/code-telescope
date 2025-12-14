import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";
import { getRegisteredFuzzyDataAdapters } from "../decorators/fuzzy-data-adapter.decorator";

export class FuzzyFinderDataAdapterRegistry {
  private adapters = new Map<string, IFuzzyFinderDataAdapter>();
  private static _instance: FuzzyFinderDataAdapterRegistry | undefined;

  private constructor() {
    for (const adapter of getRegisteredFuzzyDataAdapters()) {
      this.register(adapter);
    }
  }

  static get instance() {
    if (this._instance) return this._instance;

    this._instance = new FuzzyFinderDataAdapterRegistry();
    return this._instance;
  }

  register(adapter: IFuzzyFinderDataAdapter<any, any>) {
    this.adapters.set(adapter.fuzzyAdapterType, adapter);
  }

  getAdapter(finderType: FuzzyProviderType): IFuzzyFinderDataAdapter | undefined {
    return this.adapters.get(finderType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}
