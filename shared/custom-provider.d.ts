/**
 * Defines a custom fuzzy finder provider.
 *
 * A CustomFinderDefinition describes both the backend logic (executed in the
 * VS Code extension host) and the UI adapters (executed in the webview).
 *
 * This definition is consumed by the CustomProviderManager, which validates,
 * proxies and registers the provider at runtime.
 *
 * ---
 * Architecture overview:
 *
 * - backend: Runs in the extension process. Responsible for querying data,
 *   handling selection actions and providing preview content.
 *
 * - ui: Runs in the webview. Responsible for adapting raw data into displayable
 *   options and handling UI-specific filtering and rendering logic.
 */
export interface CustomFinderDefinition {
  /**
   * Unique identifier for the fuzzy finder.
   *
   * Built-in providers use predefined identifiers, while custom providers
   * should use the `custom.*` namespace.
   *
   * Example:
   * - "custom.github.issues"
   */
  fuzzyAdapterType: `custom.${string}`;

  /**
   * Identifier of the preview renderer associated with this finder.
   *
   * This controls how preview data is rendered inside the preview panel.
   *
   * Example:
   * - "preview.simple"
   */
  previewAdapterType: string;

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
     *
     * This method is typically called when the fuzzy finder is opened.
     */
    querySelectableOptions: () => Promise<any>;

    /**
     * Called when the user selects an item.
     *
     * Should return the data to be used by the action and an action identifier.
     */
    onSelect: (item: any) => Promise<{
      data: any;
      action: string;
    }>;

    /**
     * Returns preview data for the given identifier.
     *
     * The returned object will be passed to the preview renderer.
     */
    getPreviewData: (identifier: any) => Promise<Record<string, any>>;
  };

  /**
   * UI adapters executed in the webview.
   *
   * This layer adapts raw backend data into UI-friendly representations.
   */
  ui: {
    /**
     * Data adapter used to transform and display options in the UI.
     */
    dataAdapter: {
      /**
       * Parses raw backend data into a list of selectable options.
       */
      parseOptions: (data: any) => any[];

      /**
       * Returns the text displayed for a given option.
       */
      getDisplayText: (option: any) => string;

      /**
       * Returns the value used to identify an option when selected.
       */
      getSelectionValue: (option: any) => string;

      /**
       * Optional custom filter logic for options.
       *
       * If provided, it overrides the default fuzzy filtering behavior.
       */
      filterOption?: (option: any, query: string) => boolean;
    };

    /**
     * Optional custom render adapter for advanced UI customization.
     *
     * This can be used to provide custom rendering logic or components
     * for the finder UI.
     */
    renderAdapter?: {};
  };
}
