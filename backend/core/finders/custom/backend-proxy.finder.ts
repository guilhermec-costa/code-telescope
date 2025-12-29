import * as fs from "fs";
import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { IFuzzyFinderProvider } from "../../abstractions/fuzzy-finder.provider";
import { FuzzyFinderPanelController } from "../../presentation/fuzzy-panel.controller";
import { WorkspaceFileFinder } from "../ws-files.finder";

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

  /**
   * Creates a backend proxy from a validated custom finder definition.
   *
   * Use the static {@link create} factory instead of calling this constructor directly.
   */
  private constructor(def: CustomFinderDefinition) {
    this.fuzzyAdapterType = def.fuzzyAdapterType as any;
    this.previewAdapterType = "preview.codeHighlighted";

    this.querySelectableOptions = def.backend.querySelectableOptions;
    this.onSelect = async (item: any) => {
      const selectedData = await def.backend.onSelect(item);
      if (!selectedData) return;

      const { action, path } = selectedData;
      switch (action) {
        case "openFile": {
          if (!fs.existsSync(path)) {
            await vscode.window.showErrorMessage(`Code Telescope: file not found\n${path}`);
            break;
          }
          await new WorkspaceFileFinder().onSelect(path);
          break;
        }
        case "none": {
          FuzzyFinderPanelController.instance?.dispose();
          break;
        }
      }
    };

    this.getPreviewData = async (identifier: string) => {
      const result = await def.backend.getPreviewData(identifier);
      return {
        content: {
          text: result.content,
        },
        language: result.language,
      } as any;
    };
  }

  /**
   * Validates a custom finder definition and creates a backend proxy.
   *
   * @returns A result object containing either the proxy instance or an error message.
   */
  static create(
    def: CustomFinderDefinition,
  ): { ok: true; value: CustomFinderBackendProxy } | { ok: false; error: string } {
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
