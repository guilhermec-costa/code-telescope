import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { getRegisteredFuzzyFinderAdapters } from "../decorators/fuzzy-finder-provider.decorator";

export class FuzzyFinderAdapterRegistry {
  private adapters = new Map<string, IFuzzyFinderProvider>();
  private static _instance: FuzzyFinderAdapterRegistry | null = null;

  private constructor() {
    for (const adapter of getRegisteredFuzzyFinderAdapters()) {
      this.register(adapter);
    }
  }

  static get instance() {
    if (this._instance) return this._instance;

    this._instance = new FuzzyFinderAdapterRegistry();
    return this._instance;
  }

  register(adapter: IFuzzyFinderProvider) {
    this.adapters.set(adapter.fuzzyAdapterType, adapter);
  }

  getAdapter(finderType: FuzzyProviderType): IFuzzyFinderProvider | undefined {
    return this.adapters.get(finderType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  getCustomTypes(): string[] {
    return this.getRegisteredTypes().filter((type) => type.startsWith("custom."));
  }
}
