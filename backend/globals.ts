import * as vscode from "vscode";

/**
 * Shared global constants and runtime values used by the extension.
 */
export namespace Globals {
  /** Extension identifier */
  export const EXTENSION_NAME = "code-telescope";

  /** Prefix for extension configuration keys */
  export const EXTENSION_CONFIGURATION_PREFIX = "codeTelescope";

  export let ENV: vscode.ExtensionMode;

  /** Prefix used to identify custom providers */
  export const CUSTOM_PROVIDER_PREFIX = "custom.";

  /** Extension root URI (resolved at activation) */
  export let EXTENSION_URI: vscode.Uri;

  export let USER_THEME: string;

  /** Common VS Code command identifiers */
  export const cmds = {
    openFile: "vscode.open",
    focusActiveFile: "workbench.action.focusActiveEditorGroup",
  };

  /** Common VS Code configuration sections */
  export const cfgSections = {
    colorTheme: "workbench.colorTheme",
    fontSize: "window.zoomLevel",
  };
}
