import { HtmlWrapperConfig } from "./abstractions/fuzzy-finder-data-adapter";
import { PreviewRendererType } from "./adapters-namespace";
import { type PreviewData } from "./extension-webview-protocol";

/**
 * Defines a custom fuzzy finder provider.
 *
 * A CustomFinderDefinition describes both the backend logic (executed in the
 * VS Code extension host) and the UI adapters (executed in the webview).
 *
 * This definition is consumed by the CustomProviderManager, which validates,
 * proxies and registers the provider at runtime.
 *
 */
export interface CustomFinderDefinition {
  /**
   * Unique identifier for the fuzzy finder.
   *
   * Built-in providers use predefined identifiers, while custom providers
   * should use the `custom.*` namespace.
   *
   * @example "custom.github.issues"
   */
  fuzzyAdapterType: `custom.${string}` | `ext.${string}.${string}`;

  /**
   * Backend implementation executed in the extension host.
   *
   * This layer is responsible for:
   * - Querying selectable options
   * - Handling selection actions
   * - Providing data for previews
   */
  backend: {
    /**
     * Queries and returns the list of selectable options.
     * Typically called when the fuzzy finder is opened.
     */
    querySelectableOptions: () => Promise<any>;

    /**
     * Called when the user selects an item.
     * Should return a SelectAction describing what to do next.
     */
    onSelect: (item: any) => Promise<SelectAction> | void;

    /**
     * Returns preview data for the given identifier.
     * The returned object will be passed to the preview renderer.
     */
    getPreviewData: (identifier: any) => Promise<PreviewData>;

    /**
     * Which preview renderer to use.
     * Defaults to "preview.buffer" (plain text / code).
     */
    previewRenderer?: PreviewRendererType;
  };

  /**
   * UI adapters executed in the webview.
   * Adapts raw backend data into UI-friendly representations.
   */
  ui: {
    /**
     * Data adapter used to transform and display options in the UI.
     *
     * HTML wrapper behavior is configured via HtmlWrapperConfig:
     * - "file-icon": picks icon from file extension, requires getSearchText to return a path
     * - "codicon": uses a VS Code codicon, requires getCodiconName
     * - "simple": plain text, no icon
     * - no preset: requires getHtmlWrapper function
     */
    dataAdapter: {
      /**
       * Parses raw backend data into a list of selectable options.
       */
      parseOptions: (data: any) => any[];

      /**
       * Returns the value used to identify an option when selected.
       * This value is passed to backend's onSelect.
       */
      getSelectionValue: (option: any) => string;

      /**
       * Returns the searchable text for a given option.
       * Used by the fuzzy engine for matching.
       */
      getSearchText: (option: any) => string;
    } & HtmlWrapperConfig;
  };
}

export type SelectAction =
  | { action: "openFile"; path: string; line?: number }
  | { action: "openUrl"; url: string }
  | { action: "copyToClipboard"; text: string }
  | { action: "executeCommand"; command: string; args?: any[] }
  | { action: "dismiss" }
  | { action: "none" };
