import * as vscode from "vscode";
import { IFuzzyFinderProvider } from "../../../shared/abstractions/fuzzy-finder.provider";
import { IFuzzyFinderDataAdapter } from "../../../shared/abstractions/fuzzy-finder-data-adapter";
import { CustomFuzzyProviderType, FuzzyProviderType } from "../../../shared/adapters-namespace";

export interface FinderRegistration<TData = any, TOption = any> {
  /**
   * The backend provider, implementing the same interface as built-in finders.
   *
   * Must use the "ext.{publisher}.{name}" namespace to avoid collisions.
   * @example "ext.mycompany.myplugin.issues"
   */
  provider: IFuzzyFinderProvider;

  /**
   * The UI data adapter, implementing the same interface as built-in adapters.
   *
   * Transforms raw data from the provider into displayable options.
   * Since this is passed by reference (not serialized via eval),
   * closures and external references work normally.
   */
  dataAdapter: IFuzzyFinderDataAdapter<TData, TOption>;
}

/**
 * Public API returned by Code Telescope's activate function.
 *
 * Other extensions can consume this API via:
 * @example
 * ```ts
 * const ext = vscode.extensions.getExtension<CodeTelescopeAPI>("guichina.code-telescope");
 * const api = await ext?.activate();
 *
 * const disposable = api.registerFinder({
 *   provider: {
 *     fuzzyAdapterType: "ext.mycompany.myplugin.issues",
 *     previewAdapterType: "preview.buffer",
 *     dataAdapterType: "ext.mycompany.myplugin.issues",
 *     async querySelectableOptions() { ... },
 *     async onSelect(item) { ... },
 *     async getPreviewData(id) { ... },
 *   },
 *   dataAdapter: {
 *     typeName: "ext.mycompany.myplugin.issues",
 *     parseOptions(data) { ... },
 *     getSearchText(option) { ... },
 *     getHtmlWrapper(option, highlighted) { ... },
 *     getSelectionValue(option) { ... },
 *     filterOption(option, query) { ... },
 *   }
 * });
 *
 * ctx.subscriptions.push(disposable);
 * ```
 */
export interface CodeTelescopeAPI {
  /**
   * The current API version. Follows semver.
   * Check this before using features that may not be available in older versions.
   */
  readonly version: string;

  /**
   * Registers a finder programmatically using the same interface as built-in finders.
   *
   * Unlike `CustomFinderDefinition` (which uses file-based .cjs definitions and
   * serializes UI functions via eval), this API accepts plain TypeScript objects
   * with full type safety, closure support, and no serialization overhead.
   *
   * The returned Disposable unregisters the finder when disposed.
   *
   * @throws If the fuzzyAdapterType is already registered or doesn't use the "ext.*" namespace.
   */
  registerFinder<TData = any, TOption = any>(registration: FinderRegistration<TData, TOption>): vscode.Disposable;

  /**
   * Opens a finder panel by its type identifier.
   * Works for both built-in and custom/external finders.
   */
  openFinder(type: FuzzyProviderType | CustomFuzzyProviderType | string): Promise<void>;

  /**
   * Returns all currently registered finder type identifiers.
   */
  getRegisteredFinders(): string[];

  /**
   * Returns only the custom finder type identifiers —
   * those registered via `.finder.cjs` files.
   */
  getCustomFinders(): string[];

  /**
   * Returns only the external finder type identifiers —
   * those registered by third-party extensions via `registerFinder`.
   */
  getExternalFinders(): string[];

  /**
   * Checks whether a finder with the given type is currently registered.
   */
  hasFinder(type: string): boolean;

  /**
   * Unregisters a custom or external finder by its type identifier.
   * No-op if the finder is not registered or is a built-in finder.
   */
  unregisterFinder(type: string): void;
}
