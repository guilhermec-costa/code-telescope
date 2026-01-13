import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { Globals } from "../../globals";
import { withPerformanceLogging } from "../../perf/perf-log";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { getRegisteredFuzzyFinderAdapters } from "../decorators/fuzzy-finder-provider.decorator";
import { Logger } from "../log";

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
    const wrappedProvider = withPerformanceLogging(adapter);
    this.adapters.set(adapter.fuzzyAdapterType, wrappedProvider);
    Logger.debug(`Registered fuzzy finder adapter: ${adapter.fuzzyAdapterType} (${adapter.constructor?.name})`);
  }

  getAdapter(finderType: FuzzyProviderType): IFuzzyFinderProvider | undefined {
    return this.adapters.get(finderType);
  }

  deleteAdapter(finderType: string): void {
    this.adapters.delete(finderType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }

  getCustomTypes(): string[] {
    return this.getRegisteredTypes().filter((type) => type.startsWith(Globals.CUSTOM_PROVIDER_PREFIX));
  }
}
