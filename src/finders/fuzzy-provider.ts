export interface FuzzyProvider {
  /**
   * Returns the list of items to be displayed in the fuzzy finder.
   * Example: files, branches, symbols, commands...
   */
  querySelectableOptions(): Promise<string[]>;

  /**
   * Triggered when the user selects an item (Enter).
   * Can open a file, switch branches, execute a command...
   */
  onSelect?(item: string): void | Promise<void>;
}
