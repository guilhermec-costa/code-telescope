import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";

interface FuzzyAdapterConfig {
  fuzzy: FuzzyProviderType;
  preview: PreviewRendererType;
}

const GlobalFuzzyAdapterRegistry: IFuzzyFinderDataAdapter[] = [];

export function FuzzyFinderDataAdapter(config: FuzzyAdapterConfig) {
  return function <T extends { new (...args: any[]) }>(constructor: T) {
    const castedPrototype = constructor.prototype as IFuzzyFinderDataAdapter;
    castedPrototype.fuzzyAdapterType = config.fuzzy;
    castedPrototype.previewAdapterType = config.preview;

    GlobalFuzzyAdapterRegistry.push(new constructor());
  };
}

export function getRegisteredFuzzyAdapters() {
  return GlobalFuzzyAdapterRegistry;
}
