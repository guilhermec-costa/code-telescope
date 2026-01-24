import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { ColorSchemesFinderData, ColorThemeData } from "../../../shared/exchange/colorschemes";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { PreContextManager } from "../common/pre-context";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";
import { ThemeLoader } from "../theme-loader";

/**
 * Fuzzy provider that retrieves available color schemes.
 *
 * Lists all installed color themes and allows quick switching between them.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.colorschemes",
  previewRenderer: "preview.codeHighlighted",
})
export class ColorSchemesFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  async querySelectableOptions(): Promise<ColorSchemesFinderData> {
    const themes = await this.getColorThemes();

    const displayTexts = themes.map((theme) => {
      const indicator = theme.isCurrent ? "● " : "  ";
      const name = theme.label.padEnd(40);
      const extension = theme.extensionId ? `[${theme.extensionId}]` : "";

      return `${indicator} ${name} ${extension}`;
    });

    return {
      themes,
      displayTexts,
    };
  }

  async onSelect(themeData: ColorThemeData) {
    this.updateTheme(themeData).then(async () => {
      await PreContextManager.instance.focusOnCapture();
    });
  }

  private async updateTheme(themeData: ColorThemeData) {
    try {
      vscode.workspace
        .getConfiguration()
        .update(Globals.cfgSections.colorTheme, themeData.label, vscode.ConfigurationTarget.Global);
    } catch (error) {
      console.error((error as any).message);
      await vscode.window.showErrorMessage("Failed to update theme: ");
    }
  }

  async getPreviewData(themeData: ColorThemeData): Promise<HighlightedCodePreviewData> {
    await this.updateTheme(themeData);
    const themeDetails = await ThemeLoader.getCurrentThemeData(themeData.label);
    return {
      content: {
        kind: "text",
        path: `Theme: ${themeData.label}`,
        text: this.generatePreviewContent(themeData),
      },
      language: "typescript",
      metadata: {
        themeJson: themeDetails.jsonData,
        themeType: themeDetails.type,
      },
    };
  }

  /**
   * Gets all available color themes
   */
  private async getColorThemes(): Promise<ColorThemeData[]> {
    const currentTheme = vscode.workspace.getConfiguration().get<string>("workbench.colorTheme");

    const extensions = vscode.extensions.all;
    const themes: ColorThemeData[] = [];

    for (const extension of extensions) {
      const contributes = extension.packageJSON?.contributes;

      if (!contributes?.themes) continue;

      for (const theme of contributes.themes) {
        themes.push({
          id: theme.id || theme.label,
          label: theme.label,
          uiTheme: theme.uiTheme || "vs-dark",
          extensionId: extension.id,
          isCurrent: theme.label === currentTheme,
        });
      }
    }

    themes.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return a.label.localeCompare(b.label);
    });

    return themes;
  }

  /**
   * Generates preview content with theme info and sample code
   */
  private generatePreviewContent(theme: ColorThemeData): string {
    const themeInfo = `/**
 * Theme: ${theme.label}
 * Type: ${this.getThemeTypeName(theme.uiTheme)}
 * Extension: ${theme.extensionId || "Built-in"}
 * Status: ${theme.isCurrent ? "Currently Active" : "Available"}
 */

// Sample code to preview syntax highlighting
import { Component } from 'react';

interface UserProps {
  name: string;
  age: number;
  isActive: boolean;
}

class UserComponent extends Component<UserProps> {
  private readonly API_URL = 'https://api.example.com';
  
  async fetchUser(id: number): Promise<User | null> {
    try {
      const response = await fetch(\`\${this.API_URL}/users/\${id}\`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  }
  
  render() {
    const { name, age, isActive } = this.props;
    
    return (
      <div className="user-card">
        <h1>{name}</h1>
        <p>Age: {age}</p>
        <span>{isActive ? '✓ Active' : '✗ Inactive'}</span>
      </div>
    );
  }
}

export default UserComponent;`;

    return themeInfo;
  }

  /**
   * Converts UI theme identifier to readable name
   */
  private getThemeTypeName(uiTheme: string): string {
    switch (uiTheme) {
      case "vs":
        return "Light";
      case "vs-dark":
        return "Dark";
      case "hc-black":
        return "High Contrast Dark";
      case "hc-light":
        return "High Contrast Light";
      default:
        return "Unknown";
    }
  }
}
