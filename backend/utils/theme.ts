import * as vscode from "vscode";

const DEFAULT_THEME = "Default Dark+";

export const THEME_CONFIGURATION_SECTIONS = [
  "workbench.colorTheme",
  "workbench.preferredLightColorTheme",
  "workbench.preferredDarkColorTheme",
  "workbench.preferredHighContrastColorTheme",
  "workbench.preferredHighContrastLightColorTheme",
  "window.autoDetectColorScheme",
  "window.autoDetectHighContrast",
] as const;

/** Resolves the theme that VS Code is currently displaying, including automatic OS theme changes. */
export function getActiveThemeName(kind: vscode.ColorThemeKind = vscode.window.activeColorTheme.kind): string {
  const workbench = vscode.workspace.getConfiguration("workbench");
  const window = vscode.workspace.getConfiguration("window");
  const configuredTheme = workbench.get<string>("colorTheme", DEFAULT_THEME);

  if (window.get<boolean>("autoDetectHighContrast", false) && kind === vscode.ColorThemeKind.HighContrast) {
    return workbench.get<string>("preferredHighContrastColorTheme", configuredTheme);
  }

  if (window.get<boolean>("autoDetectHighContrast", false) && kind === vscode.ColorThemeKind.HighContrastLight) {
    return workbench.get<string>("preferredHighContrastLightColorTheme", configuredTheme);
  }

  if (!window.get<boolean>("autoDetectColorScheme", false)) {
    return configuredTheme;
  }

  if (kind === vscode.ColorThemeKind.Light) {
    return workbench.get<string>("preferredLightColorTheme", configuredTheme);
  }

  if (kind === vscode.ColorThemeKind.Dark) {
    return workbench.get<string>("preferredDarkColorTheme", configuredTheme);
  }

  return configuredTheme;
}
