import * as vscode from "vscode";
import { ExtensionData, ExtensionFinderData } from "../../../shared/exchange/extension";
import { TextPreviewData } from "../../../shared/extension-webview-protocol";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";

@FuzzyFinderAdapter({
  fuzzy: "workspace.extensions",
  previewRenderer: "preview.buffer",
  dataAdapter: "extensionsAdapter",
  name: "Extensions",
  description: "Browse and manage installed VS Code extensions",
})
export class ExtensionsFinder implements FuzzyFinderProvider {
  private cachedExtensions: ExtensionData[] | null = null;

  constructor() {
    vscode.extensions.onDidChange(() => {
      this.cachedExtensions = null;
    });
  }
  async querySelectableOptions(): Promise<ExtensionFinderData> {
    const extensions = this.getExtensions();
    const displayTexts = extensions.map((ext) => {
      const displayName = ext.displayName.padEnd(40);
      const status = ext.isActive ? "active" : "inactive";
      return `${displayName} -> ${ext.publisher} v${ext.version} [${status}]`;
    });
    return {
      extensions,
      displayTexts,
    };
  }

  async onSelect(selectedIndex: string) {
    const index = parseInt(selectedIndex, 10);
    const extensions = this.getExtensions();
    const selected = extensions[index];
    if (!selected) return;

    const packageJsonUri = vscode.Uri.file(`${selected.extensionPath}/package.json`);
    const document = await vscode.workspace.openTextDocument(packageJsonUri);
    await vscode.window.showTextDocument(document);
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData> {
    const index = parseInt(identifier, 10);
    const extensions = this.getExtensions();
    const selected = extensions[index];

    if (!selected) {
      return {
        content: "No extension selected",
        language: "plaintext",
        kind: "text",
      };
    }

    const content = JSON.stringify(selected.packageJSON, null, 2);

    return {
      content,
      kind: "text",
      language: "json",
    };
  }

  private getExtensions(): ExtensionData[] {
    if (this.cachedExtensions) {
      return this.cachedExtensions;
    }

    try {
      const extensions = vscode.extensions.all.map((ext) => ({
        id: ext.id,
        displayName: (ext.packageJSON as Record<string, string>)?.displayName ?? ext.id,
        description: (ext.packageJSON as Record<string, string>)?.description ?? "",
        version: (ext.packageJSON as Record<string, string>)?.version ?? "unknown",
        publisher: ext.packageJSON?.publisher ?? ext.id.split(".")[0],
        isActive: ext.isActive,
        extensionPath: ext.extensionPath,
        packageJSON: ext.packageJSON as Record<string, unknown>,
      }));
      extensions.sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return a.displayName.localeCompare(b.displayName);
      });
      this.cachedExtensions = extensions;
      return extensions;
    } catch (error) {
      vscode.window.showErrorMessage(`Error fetching extensions: ${error}`);
      return [];
    }
  }
}
