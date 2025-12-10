import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";
import { getRegisteredFuzzyAdapters } from "../decorators/fuzzy-adapter.decorator";

const GlobalFuzzyFinderDataAdapterRegistry: IFuzzyFinderDataAdapter[] = [];

export function FuzzyAdapter() {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    GlobalFuzzyFinderDataAdapterRegistry.push(new constructor() as any);
  };
}

export class FuzzyFinderAdapterRegistry {
  private adapters = new Map<string, IFuzzyFinderDataAdapter>();

  constructor() {
    for (const adapter of getRegisteredFuzzyAdapters()) {
      this.register(adapter);
    }
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
