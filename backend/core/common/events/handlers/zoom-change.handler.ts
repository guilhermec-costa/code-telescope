import * as vscode from "vscode";
import { Globals } from "../../../../globals";
import { ConfigChangeHandler } from "../../../abstractions/config-change-handler";

export class ZoomChangeHandler implements ConfigChangeHandler {
  readonly section = Globals.cfgSections.fontSize;

  handle(_: vscode.ConfigurationChangeEvent): void {
    console.log("[EventManager] Zoom level changed");
  }
}
