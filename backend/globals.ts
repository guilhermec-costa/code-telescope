import * as vscode from "vscode";

export namespace Globals {
  export const EXTENSION_NAME = "code-telescope";
  export const EXTENSION_CONFIGURATION_PREFIX = "codeTelescope";
  export let EXTENSION_URI: vscode.Uri;

  /** Current user theme */
  export let USER_THEME: string;

  export const cmds = {
    openFile: "vscode.open",
    focusActiveFile: "workbench.action.focusActiveEditorGroup",
  };

  export const cfgSections = {
    colorTheme: "workbench.colorTheme",
  };
}
