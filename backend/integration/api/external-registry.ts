import { IFuzzyFinderProvider } from "../../../shared/abstractions/fuzzy-finder.provider";
import { Logger } from "../../core/log";
import { FinderRegistration } from "../../integration/api/api";

interface SerializedDataAdapter {
  typeName: string;
  parseOptions: string;
  getSearchText: string;
  getHtmlWrapper: string;
  getSelectionValue: string;
  filterOption?: string;
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
 *
 * Stores both the provider (used in the extension host) and a serialized
 * version of the dataAdapter (sent to the webview when the finder opens).
 *
 * This mirrors what CustomFinderUiProxy does for .cjs custom finders,
 * but for programmatically registered external finders.
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

    const serializedDataAdapter: SerializedDataAdapter = {
      typeName: dataAdapter.typeName,
      parseOptions: this.serializeFn(dataAdapter.parseOptions),
      getSearchText: this.serializeFn(dataAdapter.getSearchText),
      getHtmlWrapper: this.serializeFn(dataAdapter.getHtmlWrapper),
      getSelectionValue: this.serializeFn(dataAdapter.getSelectionValue),
      filterOption: dataAdapter.filterOption ? this.serializeFn(dataAdapter.filterOption) : undefined,
      sortFn: dataAdapter.sortFn ? this.serializeFn(dataAdapter.sortFn) : undefined,
      calcHlOffsetChars: dataAdapter.calcHlOffsetChars ? this.serializeFn(dataAdapter.calcHlOffsetChars) : undefined,
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

  private serializeFn(fn: Function): string {
    const src = fn.toString();
    if (!src.startsWith("function") && !src.startsWith("(") && !src.startsWith("async")) {
      return "function " + src;
    }
    return src;
  }
}
