import * as vscode from "vscode";

export namespace Globals {
  export const EXTENSION_NAME = "code-telescope";
  export const EXTENSION_CONFIGURATION_PREFIX_NAME = "codeTelescope";
  export let EXTENSION_URI: vscode.Uri;
  export let USER_THEME: string;

  export const cmds = {
    openFile: "vscode.open",
  };

  export const cfgSections = {
    colorTheme: "workbench.colorTheme",
  };
}
