import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";

interface FuzzyDataAdapterConfig {
  fuzzy: FuzzyProviderType;
  preview: PreviewRendererType;
}

const GlobalFuzzyDataAdapterRegistry: IFuzzyFinderDataAdapter[] = [];

export function FuzzyFinderDataAdapter(config: FuzzyDataAdapterConfig) {
  return function <T extends { new (...args: any[]) }>(constructor: T) {
    const castedPrototype = constructor.prototype as IFuzzyFinderDataAdapter;
    castedPrototype.fuzzyAdapterType = config.fuzzy;
    castedPrototype.previewAdapterType = config.preview;
    registerFuzzyDataAdapter(new constructor());
  };
}

export function getRegisteredFuzzyDataAdapters() {
  return GlobalFuzzyDataAdapterRegistry;
}

export function registerFuzzyDataAdapter(adapter: IFuzzyFinderDataAdapter) {
  GlobalFuzzyDataAdapterRegistry.push(adapter);
}
