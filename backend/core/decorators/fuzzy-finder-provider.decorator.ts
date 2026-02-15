import { DataAdapterType, FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";

/**
 * Configuration object for a fuzzy finder adapter.
 */
interface FuzzyFinderAdapterConfig {
  fuzzy: FuzzyProviderType;
  previewRenderer: PreviewRendererType;
  dataAdapter: DataAdapterType;
}

const GlobalFuzzyFinderAdapterRegistry: IFuzzyFinderProvider[] = [];

/**
 * Decorator used to register a fuzzy finder provider.
 *
 * Instantiates the provider, assigns adapter metadata
 * and registers it in the global registry.
 */
export function FuzzyFinderAdapter(config: FuzzyFinderAdapterConfig) {
  return function <T extends { new (...args: any[]): IFuzzyFinderProvider }>(constructor: T) {
    const instance = new constructor();
    instance.fuzzyAdapterType = config.fuzzy;
    instance.previewAdapterType = config.previewRenderer;
    instance.dataAdapterType = config.dataAdapter;
    GlobalFuzzyFinderAdapterRegistry.push(instance);
  };
}

export function getRegisteredFuzzyFinderAdapters() {
  return GlobalFuzzyFinderAdapterRegistry;
}
