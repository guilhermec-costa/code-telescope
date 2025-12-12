import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { getRegisteredFuzzyFinderAdapters } from "../decorators/fuzzy-finder-provider.decorator";
import { IFuzzyFinderProvider } from "../finders/fuzzy-finder.provider";

export class FuzzyFinderAdapterRegistry {
  private adapters = new Map<string, IFuzzyFinderProvider>();

  constructor() {
    for (const adapter of getRegisteredFuzzyFinderAdapters()) {
      this.register(adapter);
    }
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
}
