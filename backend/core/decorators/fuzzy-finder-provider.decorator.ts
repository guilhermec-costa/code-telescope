import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderProvider } from "../finders/fuzzy-finder.provider";

interface FuzzyFinderAdapterConfig {
  fuzzy: FuzzyProviderType;
  previewRenderer: PreviewRendererType;
}

const GlobalFuzzyFinderAdapterRegistry: IFuzzyFinderProvider[] = [];

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
