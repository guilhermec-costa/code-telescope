import path from "path";
import * as vscode from "vscode";
import { Globals } from "../../globals";
import { joinPath } from "../../utils/files";
import { IFuzzyFinderProvider, LayoutCustomPlaceholders } from "../abstractions/fuzzy-finder.provider";
import { ExtensionConfigManager } from "../common/config-manager";
import { CustomProviderStorage } from "./custom/custom-provider.storage";

/**
 * Responsible for resolving and processing webview HTML assets.
 *
 * Handles placeholder replacement, asset URI resolution,
 * global state injection and dynamic styling.
 */
export class WebviewAssetManager {
  public static async getProcessedHtml(wv: vscode.Webview, provider: IFuzzyFinderProvider): Promise<string> {
    const customPlaceholders = provider.customPlaceholders?.() ?? {};

    const layoutFilename =
      customPlaceholders.layoutHtmlFilename ?? `${ExtensionConfigManager.layoutCfg.mode}.view.html`;
    const htmlPath = joinPath(Globals.EXTENSION_URI, "ui", "views", layoutFilename);
    const rawContent = (await vscode.workspace.fs.readFile(htmlPath)).toString();

    let html = this.resolveAssetUris(rawContent, wv, customPlaceholders);
    html = this.injectGlobalState(html, wv, provider);
    html = this.injectDynamicStyles(html);

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
      "{{script}}": path.join(basePath, "index.js"),
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
  private static injectGlobalState(html: string, wv: vscode.Webview, provider: IFuzzyFinderProvider): string {
    const shikiUri = wv.asWebviewUri(joinPath(Globals.EXTENSION_URI, "ui", "dist", "shiki"));

    let customUiPayload: unknown = null;

    const isCustom = provider.fuzzyAdapterType.startsWith(Globals.CUSTOM_PROVIDER_PREFIX);

    if (isCustom) {
      const uiResult = CustomProviderStorage.instance.getUiProxyDefinition(provider.fuzzyAdapterType);

      if (uiResult) {
        if (!uiResult.ok) {
          console.error("[WebviewAssetManager] Failed to load custom UI adapter:", uiResult.error);
        } else {
          customUiPayload = uiResult.value.toSerializableObject();
        }
      }
    }
    const state: Record<string, string> = {
      "{{__SHIKI_URI__}}": shikiUri.toString(),
      "{{__PREVIEW_CFG__}}": JSON.stringify(ExtensionConfigManager.previewManagerCfg),
      "{{__WS_PATH_DISPLAY__}}": ExtensionConfigManager.wsFileFinderCfg.textDisplay,
      "{{__KEYBINDINGS_CFG__}}": JSON.stringify(ExtensionConfigManager.keybindings),
      "{{__CUSTOM_DATA_ADAPTER__}}": JSON.stringify(customUiPayload, null, 2),
      "{{__CUSTOM_RENDER_ADAPTERS__}}": JSON.stringify([]),
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
  private static injectDynamicStyles(html: string): string {
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
    const styleTag = `<style>:root { ${cssBody} }</style>`;

    return html.replace("<cssvariables></cssvariables>", styleTag);
  }
}
