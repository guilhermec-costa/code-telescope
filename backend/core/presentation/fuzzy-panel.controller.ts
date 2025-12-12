import * as vscode from "vscode";
import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { FromWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { execCmd } from "../../utils/commands";
import { joinPath } from "../../utils/files";
import { getShikiLanguage, getShikiTheme } from "../../utils/shiki";
import { IFuzzyFinderProvider } from "../finders/fuzzy-finder.provider";
import { VSCodeEventsManager } from "../services/code-events.service";
import { FuzzyFinderAdapterRegistry } from "../services/fuzzy-provider.registry";
import { WebviewController } from "./webview.controller";

/**
 * Handles communication between backend (extension) and frontend (Webview UI)
 */
export class FuzzyPanelController {
  private readonly wvController: WebviewController;
  private readonly adapterRegistry: FuzzyFinderAdapterRegistry;
  private static panelRevealPosition = vscode.ViewColumn.Active;
  private provider!: IFuzzyFinderProvider;

  public readonly wvPanel: vscode.WebviewPanel;
  public static instance: FuzzyPanelController | undefined;

  private constructor(_wvPanel: vscode.WebviewPanel) {
    console.log("[FuzzyPanel] Creating a new panel instance");
    this.wvPanel = _wvPanel;
    this.wvController = new WebviewController(this.wvPanel.webview);
    this.adapterRegistry = new FuzzyFinderAdapterRegistry();

    _wvPanel.onDidDispose(() => {
      console.log("[FuzzyPanel] Panel disposed");
      FuzzyPanelController.instance = undefined;
    });
  }

  private static createPanel() {
    console.log("[FuzzyPanel] Creating a new WebviewPanel");

    const panel = vscode.window.createWebviewPanel(
      "code-telescope-fuzzy",
      "Code Telescope - Fuzzy Finder",
      {
        viewColumn: this.panelRevealPosition,
        preserveFocus: true,
      },
      {
        enableScripts: true,
        localResourceRoots: [
          joinPath(Globals.EXTENSION_URI, "ui"),
          joinPath(Globals.EXTENSION_URI, "ui/dist"),
          joinPath(Globals.EXTENSION_URI, "ui/dist/shiki"),
        ],
      },
    );

    return panel;
  }

  /**
   * Shows an existing panel or creates and displays a new one.
   * @returns The active FuzzyPanelController instance.
   */
  public static createOrShow() {
    if (FuzzyPanelController.instance) {
      console.log("[FuzzyPanel] Reusing existing panel");
      FuzzyPanelController.instance.wvPanel.reveal(this.panelRevealPosition, false);
      return FuzzyPanelController.instance;
    }

    const panel = this.createPanel();
    FuzzyPanelController.instance = new FuzzyPanelController(panel);
    VSCodeEventsManager.init();
    FuzzyPanelController.instance.listenWebview();
    return FuzzyPanelController.instance;
  }

  public async startProvider(providerType: FuzzyProviderType) {
    const provider = this.adapterRegistry.getAdapter(providerType);
    if (!provider) return;

    this.setFuzzyProvider(provider);
    this.wvPanel.webview.html = await this.wvController.resolveWebviewHtml(this.provider.getHtmlLoadConfig());
    await this.emitResetWebviewEvent();
  }

  /**
   * Assigns the active fuzzy provider, loads HTML, and sends the initial option list.
   * @param provider The provider responsible for options and preview logic.
   */
  private async setFuzzyProvider(provider: IFuzzyFinderProvider) {
    console.log(`[FuzzyPanel] Setting provider of type "${provider.fuzzyAdapterType}"`);
    this.provider = provider;
  }

  /**
   * Sends an event to the Webview instructing it to clear current preview data and current input search
   */
  private async emitResetWebviewEvent() {
    console.log(`[FuzzyPanel] Sending ClearPreview event`);
    await this.wvController.sendMessage({
      type: "resetWebview",
    });
  }

  /**
   * Sends a new list of selectable options to the Webview.
   * @param options fuzzy-selectable items.
   */
  private async emitOptionsListEvent(options: any) {
    console.log(`[FuzzyPanel] Sending optionList event with ${options.length} options`);

    await this.wvController.sendMessage({
      type: "optionList",
      data: options,
      fuzzyProviderType: this.provider.fuzzyAdapterType,
    });
  }

  /**
   * Sends a theme change/update event to the Webview.
   * @param theme Shiki-compatible theme name (e.g., "dark-plus").
   */
  public async emitThemeUpdateEvent(theme: string) {
    await this.wvController.sendMessage({
      type: "themeUpdate",
      data: { theme: getShikiTheme(theme) },
    });
  }

  public async emitLoadLanguageEvent(language: string) {
    await this.wvController.sendMessage({
      type: "languageUpdate",
      data: { lang: getShikiLanguage(language) },
    });
  }

  /**
   * Sets up event listeners for messages sent from the Webview UI.
   */
  public listenWebview() {
    console.log("[FuzzyPanel] Listening for webview messages");
    this.wvController.onMessage(async (msg: FromWebviewKindMessage) => {
      console.log(`[FuzzyPanel] Received message of type: ${msg.type}`);

      switch (msg.type) {
        case "webviewDOMReady": {
          console.log("[FuzzyPanel] Webview is ready, sending initial options");
          await VSCodeEventsManager.emitInitialEvents();
          const items = await this.provider.querySelectableOptions();
          await this.emitOptionsListEvent(items);
          break;
        }

        case "closePanel": {
          this.dispose();
          await execCmd(Globals.cmds.focusActiveFile);
          break;
        }

        case "previewRequest": {
          console.log(`[FuzzyPanel] Preview requested for: ${msg.data}`);
          await this.handlePreviewRequest(msg.data);
          break;
        }

        case "dynamicSearch": {
          if (this.provider.supportsDynamicSearch && this.provider.searchOptions) {
            const results = await this.provider.searchOptions(msg.query);
            await this.emitOptionsListEvent(results);
          }
          break;
        }

        case "optionSelected": {
          const selected = msg.data;

          if (this.provider.onSelect) {
            await this.provider.onSelect(selected);
            return;
          }

          this.dispose();
          const uri = vscode.Uri.file(selected);
          await execCmd(Globals.cmds.openFile, uri);
        }
      }
    });
  }

  /**
   * Disposes (closes) the current panel.
   */
  public dispose() {
    console.log("[FuzzyPanel] Closing panel");
    this.wvPanel.dispose();
  }

  /**
   * Handles a preview request by fetching preview data and notifying the Webview.
   * @param identifier The item identifier for which preview data should be fetched.
   */
  private async handlePreviewRequest(identifier: string) {
    console.log(`[FuzzyPanel] Getting preview data for: ${identifier}`);
    const previewData = await this.provider.getPreviewData(identifier);

    console.log("[FuzzyPanel] Sending previewUpdate event");
    await this.wvController.sendMessage({
      type: "previewUpdate",
      previewAdapterType: this.provider.previewAdapterType,
      data: previewData,
    });
  }
}

const themeToModulePathMap: Record<string, string> = {
  "Default Dark+": "ui/dist/shiki/themes/dark-plus.mjs",
  "Tokyo Night": "ui/dist/shiki/themes/tokyo-night.mjs",
  Monokai: "ui/dist/shiki/themes/monokai.mjs",
};

const langToModulePathMap: Record<string, string> = {
  javascript: "ui/dist/shiki/langs/js.mjs",
  typescript: "ui/dist/shiki/langs/ts.mjs",
  python: "ui/dist/shiki/langs/python.mjs",
  json: "ui/dist/shiki/langs/json.mjs",
};
