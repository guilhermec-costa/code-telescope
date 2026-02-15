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

export type FuzzyFinderProvider = Omit<
  IFuzzyFinderProvider,
  "fuzzyAdapterType" | "previewAdapterType" | "dataAdapterType"
>;

const GlobalFuzzyFinderAdapterRegistry: IFuzzyFinderProvider[] = [];

/**
 * Decorator used to register a fuzzy finder provider.
 *
 * Instantiates the provider, assigns adapter metadata
 * and registers it in the global registry.
 */
export function FuzzyFinderAdapter(config: FuzzyFinderAdapterConfig) {
  return function <T extends { new (...args: any[]): FuzzyFinderProvider }>(constructor: T) {
    (constructor.prototype as IFuzzyFinderProvider).fuzzyAdapterType = config.fuzzy;
    (constructor.prototype as IFuzzyFinderProvider).previewAdapterType = config.previewRenderer;
    (constructor.prototype as IFuzzyFinderProvider).dataAdapterType = config.dataAdapter;

    const instance = new constructor() as IFuzzyFinderProvider;

    GlobalFuzzyFinderAdapterRegistry.push(instance);
  };
}

export function getRegisteredFuzzyFinderAdapters() {
  return GlobalFuzzyFinderAdapterRegistry;
}
