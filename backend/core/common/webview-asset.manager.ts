import { randomUUID } from "crypto";
import path from "path";
import * as vscode from "vscode";
import { IFuzzyFinderProvider, LayoutCustomPlaceholders } from "../../../shared/abstractions/fuzzy-finder.provider";
import { Globals } from "../../globals";
import { ExternalFinderRegistry } from "../../integration/api/external-registry";
import { getProviderListTitle, getProviderPreviewTitle, getProviderPromptMessage } from "../../utils/configuration";
import { joinPath } from "../../utils/files";
import { ExtensionConfigManager } from "../common/config-manager";
import { CustomProviderStorage } from "./custom/custom-provider.storage";
import { PreContextManager } from "./pre-context";

/**
 * Responsible for resolving and processing webview HTML assets.
 *
 * Handles placeholder replacement, asset URI resolution,
 * global state injection and dynamic styling.
 */
export class WebviewAssetManager {
  public static async getProcessedHtml(wv: vscode.Webview, provider: IFuzzyFinderProvider): Promise<string> {
    const customPlaceholders = provider.customPlaceholders?.() ?? {};
    const nonce = randomUUID();

    const layoutFilename =
      customPlaceholders.layoutHtmlFilename ?? `${ExtensionConfigManager.layoutCfg.mode}.view.html`;
    const htmlPath = joinPath(Globals.EXTENSION_URI, "ui", "dist", "views", layoutFilename);
    const rawContent = (await vscode.workspace.fs.readFile(htmlPath)).toString();

    let html = this.resolveAssetUris(rawContent, wv, customPlaceholders);
    html = this.injectGlobalState(html, wv, provider, nonce);
    html = this.injectDynamicStyles(html, nonce);

    return html;
  }

  /**
   * Resolves asset placeholders into webview-safe URIs.
   */
  private static resolveAssetUris(
    html: string,
    wv: vscode.Webview,
    adapterPlaceholders: LayoutCustomPlaceholders,
  ): string {
    const layoutStyleName = adapterPlaceholders.layoutCssFilename ?? `${ExtensionConfigManager.layoutCfg.mode}.css`;
    const basePath = path.join(Globals.EXTENSION_URI.fsPath, "ui", "dist"); // VSIX bundle

    const allPlaceholders = {
      ...adapterPlaceholders,
      "{{highlight-styles}}": path.join(basePath, "style/highlight.css"),
      "{{style}}": path.join(basePath, `style/${layoutStyleName}`),
      "{{branch-styles}}": path.join(basePath, "style/branch-preview.css"),
      "{{font-styles}}": path.join(basePath, "style/font-preview.css"),
      "{{script}}": path.join(basePath, "index.js"),
      "{{vim-styles}}": path.join(basePath, "style/vim.css"),
    };

    let processed = html;
    for (const [placeholder, filePath] of Object.entries(allPlaceholders)) {
      const uri = wv.asWebviewUri(vscode.Uri.file(filePath));
      processed = processed.split(placeholder).join(uri.toString());
    }

    return processed;
  }

  /**
   * Injects global runtime state and configuration into the HTML.
   */
  private static injectGlobalState(
    html: string,
    wv: vscode.Webview,
    provider: IFuzzyFinderProvider,
    nonce: string,
  ): string {
    let customUiPayload: unknown = null;

    const isCustom = provider.fuzzyAdapterType.startsWith(Globals.CUSTOM_PROVIDER_PREFIX);
    const isExternal = provider.fuzzyAdapterType.startsWith("ext.");

    if (isCustom) {
      const uiResult = CustomProviderStorage.instance.getUiProxyDefinition(provider.fuzzyAdapterType);
      if (uiResult) {
        if (!uiResult.ok) {
          console.error("[WebviewAssetManager] Failed to load custom UI adapter:", uiResult.error);
        } else {
          customUiPayload = uiResult.value.toSerializableObject();
        }
      }
    } else if (isExternal) {
      const serialized = ExternalFinderRegistry.instance.getSerializedDataAdapter(provider.fuzzyAdapterType);
      if (serialized) {
        customUiPayload = {
          fuzzyAdapterType: provider.fuzzyAdapterType,
          previewAdapterType: provider.previewAdapterType,
          dataAdapterType: provider.dataAdapterType,
          dataAdapter: serialized,
        };
      } else {
        console.error(
          "[WebviewAssetManager] No serialized data adapter found for external finder:",
          provider.fuzzyAdapterType,
        );
      }
    }

    const ctx = PreContextManager.instance.getContext();
    const initialQuery = ctx && provider.usePreSelection ? ctx.selectedText : "";
    const csp = [
      "default-src 'none'",
      `img-src ${wv.cspSource} https: data:`,
      `style-src ${wv.cspSource} 'nonce-${nonce}'`,
      `style-src-attr 'unsafe-inline'`,
      `font-src ${wv.cspSource} data:`,
      `script-src ${wv.cspSource} 'nonce-${nonce}' 'wasm-unsafe-eval' 'unsafe-eval'`,
      `connect-src ${wv.cspSource}`,
      `base-uri ${wv.cspSource}`,
    ].join("; ");

    const state: Record<string, string> = {
      "{{__PREVIEW_CFG__}}": JSON.stringify(ExtensionConfigManager.previewManagerCfg),
      "{{__FILE_PATH_DISPLAY__}}": JSON.stringify(ExtensionConfigManager.wsFileFinderCfg.textDisplay),
      "{{__KEYBINDINGS_CFG__}}": JSON.stringify(ExtensionConfigManager.keybindings),
      "{{__MATCHING_CFG__}}": JSON.stringify(ExtensionConfigManager.matchingCfg),
      "{{__CUSTOM_DATA_ADAPTER__}}": this.escapeScriptTagContent(JSON.stringify(customUiPayload, null, 2)),
      "{{__CUSTOM_RENDER_ADAPTERS__}}": JSON.stringify([]),
      "{{__OPTIONS_SIDE_TITLE__}}": this.escapeHtml(getProviderListTitle(provider.fuzzyAdapterType)),
      "{{__PREVIEW_SIDE_TITLE__}}": this.escapeHtml(getProviderPreviewTitle(provider.fuzzyAdapterType)),
      "{{__PROMPT_MSG__}}": this.escapeHtml(getProviderPromptMessage(provider.fuzzyAdapterType)),
      "{{__PROVIDER__}}": JSON.stringify(provider.fuzzyAdapterType),
      "{{__INITIAL_QUERY__}}": JSON.stringify(initialQuery),
      "{{dist-uri}}": wv.asWebviewUri(vscode.Uri.joinPath(Globals.EXTENSION_URI, "ui", "dist")).toString(),
      "{{__NONCE__}}": nonce,
      "{{__CSP__}}": csp,
    };

    let processed = html;
    for (const [key, value] of Object.entries(state)) {
      processed = processed.split(key).join(value);
    }
    return processed;
  }

  /**
   * Injects dynamic CSS variables based on layout configuration.
   */
  private static injectDynamicStyles(html: string, nonce: string): string {
    const panelCfg = ExtensionConfigManager.layoutCfg;
    const vars = {
      "--left-pane-width": `${panelCfg.leftSideWidthPct}%`,
      "--ivy-layout-height-pct": `${panelCfg.ivyHeightPct}%`,
      "--right-pane-width": `${panelCfg.rightSideWidthPct}%`,
      "--panel-container-width": `${panelCfg.panelContainerPct}%`,
      "--prompt-font-size": `${panelCfg.promptFontSize}px`,
      "--results-font-size": `${panelCfg.resultsFontSize}px`,
      "--preview-font-size": `${panelCfg.previewFontSize}px`,
      "--border-size": `${panelCfg.borderSizeInPx}px`,
      "--border-radius": `${panelCfg.borderRadiusInPx}px`,
    };

    const cssBody = Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join("\n");
    const styleTag = `<style nonce="${nonce}">:root { ${cssBody} }</style>`;

    return html.replace("<cssvariables></cssvariables>", styleTag);
  }

  private static escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[char];
    });
  }

  private static escapeScriptTagContent(value: string): string {
    return value.replace(/<\/script/gi, "<\\/script");
  }
}
