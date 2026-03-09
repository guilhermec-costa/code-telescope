import * as vscode from "vscode";
import { IFuzzyFinderProvider } from "../../../shared/abstractions/fuzzy-finder.provider";
import { HtmlWrapperConfig, IFuzzyFinderDataAdapter } from "../../../shared/abstractions/fuzzy-finder-data-adapter";
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
   * The UI data adapter for this finder.
   *
   * Use a preset via htmlWrapperPreset for common icon styles (file-icon, codicon, simple),
   * or provide a custom getHtmlWrapper function for full control.
   *
   * **Note:** Functions are serialized via .toString() and reconstructed in the webview.
   * Closures that reference external variables will not work — all logic must be self-contained.
   */
  dataAdapter: Omit<
    IFuzzyFinderDataAdapter<TData, TOption>,
    "getHtmlWrapper" | "htmlWrapperPreset" | "getCodiconName"
  > &
    HtmlWrapperConfig;
}

/**
 * Public API returned by Code Telescope's activate function.
 *
 * Other extensions can consume this API via:
 * @example
 * ```ts
 * const ext = vscode.extensions.getExtension<CodeTelescopeAPI>("guichina.code-telescope");
 * const api = await ext?.activate();
 * ```
 */
export interface CodeTelescopeAPI {
  /**
   * Registers a finder programmatically using the same interface as built-in finders.
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
