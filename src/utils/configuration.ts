import * as vscode from "vscode";

export function getConfigurationSection<T>(section: string, defaultValue: T): T {
  return vscode.workspace.getConfiguration().get<T>(section, defaultValue);
}
