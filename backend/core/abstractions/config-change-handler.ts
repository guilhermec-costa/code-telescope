import * as vscode from "vscode";

export interface ConfigChangeHandler {
  /**
   * Section watched by this handler.
   * Must be compatible with `e.affectsConfiguration(section)`
   */
  readonly section: string;

  /**
   * Called when the configuration section changes.
   */
  handle(event: vscode.ConfigurationChangeEvent): void | Promise<void>;
}
