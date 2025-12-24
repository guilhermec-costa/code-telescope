import * as vscode from "vscode";
import { FromWebviewKindMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { joinPath } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { ExtensionConfigManager } from "../common/config-manager";
import { CustomProviderManager } from "../common/custom-provider-manager";

export class WebviewController {
  static async sendMessage(wv: vscode.Webview, msg: ToWebviewKindMessage) {
    await wv.postMessage(msg);
  }

  static async onMessage(wv: vscode.Webview, cb: (msg: FromWebviewKindMessage) => Promise<void>) {
    wv.onDidReceiveMessage(cb);
  }

  static async resolveProviderWebviewHtml(wv: vscode.Webview, provider: IFuzzyFinderProvider): Promise<string> {
    const cfg = provider.getHtmlLoadConfig();
    const htmlPath = joinPath(Globals.EXTENSION_URI, "ui", "views", cfg.fileName);
    const rawHtml = (await vscode.workspace.fs.readFile(htmlPath)).toString();

    let html = this.resolveFileUris(rawHtml, wv, cfg.placeholders);
    html = this.injectGlobalVariables(html, wv, provider);
    html = this.injectDynamicStyles(html);

    return html;
  }

  private static resolveFileUris(html: string, wv: vscode.Webview, placeholders: Record<string, string>): string {
    let processedHtml = html;
    for (const [key, distPath] of Object.entries(placeholders)) {
      const uri = wv.asWebviewUri(joinPath(Globals.EXTENSION_URI, distPath));
      processedHtml = processedHtml.replace(new RegExp(key, "g"), uri.toString());
    }
    return processedHtml;
  }

  private static injectGlobalVariables(html: string, wv: vscode.Webview, provider: IFuzzyFinderProvider): string {
    const shikiUri = wv.asWebviewUri(joinPath(Globals.EXTENSION_URI, "ui", "dist", "shiki"));

    const isCustom = provider.fuzzyAdapterType.startsWith(Globals.CUSTOM_PROVIDER_PREFIX);
    const customUiDef = isCustom
      ? CustomProviderManager.instance.getUiSerializedConfig(provider.fuzzyAdapterType)
      : null;

    const injections: Record<string, string> = {
      "{{__SHIKI_URI__}}": shikiUri.toString(),
      "{{__PREVIEW_CFG__}}": JSON.stringify(ExtensionConfigManager.previewManagerCfg),
      "{{__KEYBINDINGS_CFG__}}": JSON.stringify(ExtensionConfigManager.keybindings),
      "{{__CUSTOM_DATA_ADAPTER__}}": JSON.stringify(customUiDef),
      "{{__CUSTOM_RENDER_ADAPTERS__}}": JSON.stringify([]),
    };

    let processedHtml = html;
    for (const [placeholder, value] of Object.entries(injections)) {
      processedHtml = processedHtml.split(placeholder).join(value);
    }

    return processedHtml;
  }

  private static injectDynamicStyles(html: string): string {
    const panelCfg = ExtensionConfigManager.uiPanelCfg;
    const styleTag = this.buildCssVarsStyle({
      "--left-pane-width": `${panelCfg.leftSideWidthPct}%`,
      "--right-pane-width": `${panelCfg.rightSideWidthPct}%`,
      "--panel-container-width": `${panelCfg.panelContainerPct}%`,
    });
    return html.replace("<cssvariables></cssvariables>", styleTag);
  }

  private static buildCssVarsStyle(vars: Record<string, string>): string {
    const body = Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join("\n");
    return `<style>:root { ${body} }</style>`;
  }
}
