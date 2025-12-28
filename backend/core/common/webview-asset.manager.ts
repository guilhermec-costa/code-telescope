import * as vscode from "vscode";
import { Globals } from "../../globals";
import { joinPath } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { ExtensionConfigManager } from "../common/config-manager";
import { CustomProviderStorage } from "./custom/custom-provider.storage";

export class WebviewAssetManager {
  public static async getProcessedHtml(wv: vscode.Webview, provider: IFuzzyFinderProvider): Promise<string> {
    const cfg = provider.getHtmlLoadConfig();
    const htmlPath = joinPath(Globals.EXTENSION_URI, "ui", "views", cfg.fileName);
    const rawContent = (await vscode.workspace.fs.readFile(htmlPath)).toString();

    let html = this.resolveAssetUris(rawContent, wv, cfg.placeholders);
    html = this.injectGlobalState(html, wv, provider);
    html = this.injectDynamicStyles(html);

    return html;
  }

  private static resolveAssetUris(html: string, wv: vscode.Webview, placeholders: Record<string, string>): string {
    let processed = html;
    for (const [placeholder, distPath] of Object.entries(placeholders)) {
      const uri = wv.asWebviewUri(joinPath(Globals.EXTENSION_URI, distPath));
      processed = processed.split(placeholder).join(uri.toString());
    }
    return processed;
  }

  private static injectGlobalState(html: string, wv: vscode.Webview, provider: IFuzzyFinderProvider): string {
    const shikiUri = wv.asWebviewUri(joinPath(Globals.EXTENSION_URI, "ui", "dist", "shiki"));

    let customUiPayload: any = null;

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

  private static injectDynamicStyles(html: string): string {
    const panelCfg = ExtensionConfigManager.uiPanelCfg;
    const vars = {
      "--left-pane-width": `${panelCfg.leftSideWidthPct}%`,
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
