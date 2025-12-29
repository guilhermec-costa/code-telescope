import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

interface KeybindingData {
  key: string;
  command: string;
  when?: string;
  args?: any;
}

interface KeybindingFinderData {
  keybindings: KeybindingData[];
  displayTexts: string[];
}

/**
 * Fuzzy provider that retrieves user keybindings.
 *
 * Reads the keybindings.json file from the user's VSCode configuration directory.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.keybindings",
  previewRenderer: "preview.codeHighlighted",
})
export class KeybindingsFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  async querySelectableOptions(): Promise<KeybindingFinderData> {
    const keybindings = await this.getUserKeybindings();

    const displayTexts = keybindings.map((kb) => {
      const keyPart = kb.key.padEnd(25);
      const commandPart = kb.command.padEnd(40);
      const whenPart = kb.when ? ` [${kb.when}]` : "";
      return `${keyPart} ${commandPart}${whenPart}`;
    });

    return {
      keybindings,
      displayTexts,
    };
  }

  async getKbFromIdx(idx: string) {
    const index = parseInt(idx, 10);
    const keybindings = await this.getUserKeybindings();
    return keybindings[index];
  }

  async onSelect(selectedIndex: string) {
    const selected = await this.getKbFromIdx(selectedIndex);
    if (!selected) return;

    const keybindingsPath = this.getKeybindingsPath();
    if (keybindingsPath && fs.existsSync(keybindingsPath)) {
      const uri = vscode.Uri.file(keybindingsPath);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc);

      const text = doc.getText();
      const commandSearch = `"command": "${selected.command}"`;
      const keySearch = `"key": "${selected.key}"`;

      let lineNumber = 0;
      const lines = text.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(commandSearch) || lines[i].includes(keySearch)) {
          lineNumber = i;
          break;
        }
      }

      const position = new vscode.Position(lineNumber, 0);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
    }
  }

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const selected = await this.getKbFromIdx(identifier);

    if (!selected) {
      return {
        content: { path: "", text: "No keybinding selected", isCached: false },
        language: "plaintext",
      };
    }

    const previewLines = [`Key: ${selected.key}`, `Command: ${selected.command}`];

    if (selected.when) {
      previewLines.push(`When: ${selected.when}`);
    }

    if (selected.args) {
      previewLines.push(`Args: ${JSON.stringify(selected.args, null, 2)}`);
    }

    previewLines.push("");
    previewLines.push("Full JSON:");
    previewLines.push(JSON.stringify(selected, null, 2));

    return {
      content: {
        path: "Keybinding Details",
        text: previewLines.join("\n"),
        isCached: false,
      },
      language: "json",
    };
  }

  /**
   * Resolves the absolute path to the VS Code `keybindings.json` file
   * based on the current operating system.
   */
  private getKeybindingsPath(): string | null {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) return null;

    switch (process.platform) {
      case "win32":
        return path.join(homeDir, "AppData", "Roaming", "Code", "User", "keybindings.json");
      case "darwin":
        return path.join(homeDir, "Library", "Application Support", "Code", "User", "keybindings.json");
      default:
        return path.join(homeDir, ".config", "Code", "User", "keybindings.json");
    }
  }

  private async getUserKeybindings(): Promise<KeybindingData[]> {
    const keybindingsPath = this.getKeybindingsPath();

    if (!keybindingsPath || !fs.existsSync(keybindingsPath)) {
      vscode.window.showWarningMessage("Keybindings file not found");
      return [];
    }

    try {
      const content = fs.readFileSync(keybindingsPath, "utf-8");

      const jsonContent = this.removeJsonComments(content);
      const keybindings = JSON.parse(jsonContent) as KeybindingData[];

      return keybindings.filter((kb) => kb.key && kb.command);
    } catch (error) {
      vscode.window.showErrorMessage(`Error reading keybindings: ${error}`);
      return [];
    }
  }

  /**
   * Removes line and block comments from a JSON-like string.
   */
  private removeJsonComments(text: string): string {
    let result = text.replace(/\/\/.*$/gm, "");
    result = result.replace(/\/\*[\s\S]*?\*\//g, "");

    return result;
  }
}
