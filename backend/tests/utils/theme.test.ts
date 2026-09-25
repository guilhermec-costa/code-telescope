import { beforeEach, describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { getActiveThemeName } from "../../utils/theme";

const values: Record<string, Record<string, unknown>> = {
  workbench: {},
  window: {},
};

describe("getActiveThemeName", () => {
  beforeEach(() => {
    values.workbench = {
      colorTheme: "Manual Theme",
      preferredLightColorTheme: "Preferred Light",
      preferredDarkColorTheme: "Preferred Dark",
      preferredHighContrastColorTheme: "Preferred HC",
      preferredHighContrastLightColorTheme: "Preferred HC Light",
    };
    values.window = {
      autoDetectColorScheme: false,
      autoDetectHighContrast: false,
    };

    vi.mocked(vscode.workspace.getConfiguration).mockImplementation(
      (section?: string) =>
        ({
          get: (key: string, fallback?: unknown) => values[section ?? ""]?.[key] ?? fallback,
        }) as vscode.WorkspaceConfiguration,
    );
  });

  it("uses the manually configured theme when automatic detection is disabled", () => {
    expect(getActiveThemeName(vscode.ColorThemeKind.Light)).toBe("Manual Theme");
  });

  it.each([
    [vscode.ColorThemeKind.Light, "Preferred Light"],
    [vscode.ColorThemeKind.Dark, "Preferred Dark"],
  ])("uses the preferred theme for the active system color scheme", (kind, expected) => {
    values.window.autoDetectColorScheme = true;

    expect(getActiveThemeName(kind)).toBe(expected);
  });

  it.each([
    [vscode.ColorThemeKind.HighContrast, "Preferred HC"],
    [vscode.ColorThemeKind.HighContrastLight, "Preferred HC Light"],
  ])("uses the preferred theme for the active high contrast mode", (kind, expected) => {
    values.window.autoDetectHighContrast = true;

    expect(getActiveThemeName(kind)).toBe(expected);
  });

  it("falls back to the configured theme when a preferred theme is missing", () => {
    values.window.autoDetectColorScheme = true;
    delete values.workbench.preferredLightColorTheme;

    expect(getActiveThemeName(vscode.ColorThemeKind.Light)).toBe("Manual Theme");
  });
});
