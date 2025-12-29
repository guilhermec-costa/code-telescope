import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";

/**
 * Configuration object for a fuzzy finder adapter.
 */
interface FuzzyFinderAdapterConfig {
  fuzzy: FuzzyProviderType;
  previewRenderer: PreviewRendererType;
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

    GlobalFuzzyFinderAdapterRegistry.push(instance);
  };
}

export function getRegisteredFuzzyFinderAdapters() {
  return GlobalFuzzyFinderAdapterRegistry;
}
