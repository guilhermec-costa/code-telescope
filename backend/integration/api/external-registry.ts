import { IFuzzyFinderProvider } from "../../../shared/abstractions/fuzzy-finder.provider";
import { HtmlWrapperPreset } from "../../../shared/abstractions/fuzzy-finder-data-adapter";
import { Logger } from "../../core/log";
import { FinderRegistration } from "../../integration/api/api";
import { serializeFn } from "../../utils/serialization";

interface SerializedDataAdapter {
  typeName: string;
  parseOptions: string;
  getSearchText: string;
  getSelectionValue: string;
  htmlWrapperPreset: HtmlWrapperPreset | undefined;
  getHtmlWrapper?: string;
  getCodiconName?: string;
  sortFn?: string;
  shouldSort?: boolean;
  debounceSearchTime?: number;
  calcHlOffsetChars?: string;
}

interface ExternalFinderEntry {
  provider: IFuzzyFinderProvider;
  serializedDataAdapter: SerializedDataAdapter;
}

/**
 * Backend-side registry for externally registered finders.
 */
export class ExternalFinderRegistry {
  private static _instance: ExternalFinderRegistry | null = null;
  private entries = new Map<string, ExternalFinderEntry>();

  private constructor() {}

  static get instance(): ExternalFinderRegistry {
    if (!this._instance) this._instance = new ExternalFinderRegistry();
    return this._instance;
  }

  register<TData, TOption>(registration: FinderRegistration<TData, TOption>): void {
    const { provider, dataAdapter } = registration;
    const type = provider.fuzzyAdapterType;
    const adapter = dataAdapter as any;

    const serializedDataAdapter: SerializedDataAdapter = {
      typeName: dataAdapter.typeName,
      parseOptions: serializeFn(dataAdapter.parseOptions),
      getSearchText: serializeFn(dataAdapter.getSearchText),
      getSelectionValue: serializeFn(dataAdapter.getSelectionValue),
      htmlWrapperPreset: adapter.htmlWrapperPreset ?? "simple",
      getHtmlWrapper: adapter.getHtmlWrapper ? serializeFn(adapter.getHtmlWrapper) : undefined,
      getCodiconName: adapter.getCodiconName ? serializeFn(adapter.getCodiconName) : undefined,
      sortFn: dataAdapter.sortFn ? serializeFn(dataAdapter.sortFn) : undefined,
      calcHlOffsetChars: dataAdapter.calcHlOffsetChars ? serializeFn(dataAdapter.calcHlOffsetChars) : undefined,
      shouldSort: dataAdapter.shouldSort,
      debounceSearchTime: dataAdapter.debounceSearchTime,
    };

    this.entries.set(type, { provider, serializedDataAdapter });
    Logger.info(`[ExternalFinderRegistry] Registered: ${type}`);
  }

  getProvider(type: string): IFuzzyFinderProvider | undefined {
    return this.entries.get(type)?.provider;
  }

  getSerializedDataAdapter(type: string): SerializedDataAdapter | undefined {
    return this.entries.get(type)?.serializedDataAdapter;
  }

  has(type: string): boolean {
    return this.entries.has(type);
  }

  delete(type: string): void {
    this.entries.delete(type);
    Logger.info(`[ExternalFinderRegistry] Unregistered: ${type}`);
  }

  getExternalTypes(): string[] {
    return Array.from(this.entries.keys());
  }
}
