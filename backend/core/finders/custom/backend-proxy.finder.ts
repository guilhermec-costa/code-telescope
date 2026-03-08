import * as fs from "fs";
import * as vscode from "vscode";
import { IFuzzyFinderProvider } from "../../../../shared/abstractions/fuzzy-finder.provider";
import { DataAdapterType, FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { Result } from "../../../../shared/result";
import { FuzzyFinderPanelController } from "../../presentation/fuzzy-panel.controller";

/**
 * Backend proxy that adapts a user-defined {@link CustomFinderDefinition}
 * to the internal IFuzzyFinderProvider interface.
 *
 * This class:
 * - Validates and wires custom backend implementations
 * - Proxies selection actions to built-in behaviors
 * - Normalizes preview data for the preview renderer pipeline
 */
export class CustomFinderBackendProxy implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;
  dataAdapterType!: DataAdapterType;

  /**
   * Creates a backend proxy from a validated custom finder definition.
   *
   * Use the static {@link create} factory instead of calling this constructor directly.
   */
  private constructor(def: CustomFinderDefinition) {
    this.fuzzyAdapterType = def.fuzzyAdapterType as any;
    this.dataAdapterType = def.fuzzyAdapterType as any;
    this.previewAdapterType = "preview.buffer";

    this.querySelectableOptions = def.backend.querySelectableOptions;
    this.onSelect = async (item: any) => {
      const action = await def.backend.onSelect(item);
      if (!action) return;

      switch (action.action) {
        case "openFile": {
          if (!fs.existsSync(action.path)) {
            await vscode.window.showErrorMessage(`File not found: ${action.path}`);
            return;
          }
          const doc = await vscode.workspace.openTextDocument(action.path);
          const editor = await vscode.window.showTextDocument(doc);
          if (action.line !== undefined) {
            const pos = new vscode.Position(action.line, 0);
            editor.selection = new vscode.Selection(pos, pos);
            editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
          }
          break;
        }
        case "openUrl":
          await vscode.env.openExternal(vscode.Uri.parse(action.url));
          break;
        case "copyToClipboard":
          await vscode.env.clipboard.writeText(action.text);
          vscode.window.showInformationMessage(`Copied: ${action.text}`);
          break;
        case "executeCommand":
          await vscode.commands.executeCommand(action.command, ...(action.args ?? []));
          break;
        case "dismiss":
          FuzzyFinderPanelController.instance?.dispose();
          break;
      }
    };

    this.getPreviewData = async (identifier: string) => {
      const result = await def.backend.getPreviewData(identifier);
      return {
        content: result.content,
        language: result.language,
      } as any;
    };
  }

  /**
   * Validates a custom finder definition and creates a backend proxy.
   *
   * @returns A result object containing either the proxy instance or an error message.
   */
  static create(def: CustomFinderDefinition): Result<CustomFinderBackendProxy> {
    if (!def || typeof def !== "object") {
      return { ok: false, error: "Invalid custom finder definition" };
    }

    const backend = def.backend as any;

    if (!backend || typeof backend !== "object") {
      return { ok: false, error: "Missing backend implementation" };
    }

    if (typeof backend.querySelectableOptions !== "function") {
      return { ok: false, error: "backend.querySelectableOptions must be a function" };
    }

    if (typeof backend.onSelect !== "function") {
      return { ok: false, error: "backend.onSelect must be a function" };
    }

    if (typeof backend.getPreviewData !== "function") {
      return { ok: false, error: "backend.getPreviewData must be a function" };
    }

    try {
      return { ok: true, value: new CustomFinderBackendProxy(def) };
    } catch (err) {
      return { ok: false, error: "Failed to initialize custom finder proxy" };
    }
  }

  querySelectableOptions!: () => Promise<any>;
  onSelect!: (item: string) => void | Promise<void>;
  getPreviewData!: (identifier: string) => Promise<PreviewData>;

  supportsDynamicSearch = false;
}
