import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../shared/extension-webview-protocol";
import { FuzzyFinderProvider } from "../finders/fuzzy-finder.provider";
import { Globals } from "../globals";
import { execCmd } from "../utils/commands";
import { joinPath } from "../utils/files";
import { getShikiTheme } from "../utils/shiki";
import { WebviewController } from "./webview.controller";

/**
 * Handles communication between backend (extension) and frontend (Webview UI)
 */
export class FuzzyPanelController {
  public static fuzzyControllerSingleton: FuzzyPanelController | undefined;
  private static panelRevealPosition = vscode.ViewColumn.Active;

  public readonly wvPanel: vscode.WebviewPanel;
  private readonly wvController: WebviewController;
  private provider!: FuzzyFinderProvider;

  private constructor(_wvPanel: vscode.WebviewPanel) {
    console.log("[FuzzyPanel] Creating a new panel instance");
    this.wvPanel = _wvPanel;
    this.wvController = new WebviewController(this.wvPanel.webview);
    this.listenWebview();

    _wvPanel.onDidDispose(() => {
      console.log("[FuzzyPanel] Panel disposed");
      FuzzyPanelController.fuzzyControllerSingleton = undefined;
    });
  }

  /**
   * Shows an existing panel or creates and displays a new one.
   * @returns The active FuzzyPanelController instance.
   */
  static createOrShow() {
    if (FuzzyPanelController.fuzzyControllerSingleton) {
      console.log("[FuzzyPanel] Reusing existing panel");
      FuzzyPanelController.fuzzyControllerSingleton.wvPanel.reveal(this.panelRevealPosition, false);
      return FuzzyPanelController.fuzzyControllerSingleton;
    }

    console.log("[FuzzyPanel] Creating a new WebviewPanel");
    const panel = vscode.window.createWebviewPanel(
      "code-telescope-fuzzy",
      "Code Telescope - Fuzzy Finder",
      {
        viewColumn: this.panelRevealPosition,
        preserveFocus: false,
      },
      {
        enableScripts: true,
        localResourceRoots: [joinPath(Globals.EXTENSION_URI, "ui"), joinPath(Globals.EXTENSION_URI, "ui/dist")],
      },
    );

    FuzzyPanelController.fuzzyControllerSingleton = new FuzzyPanelController(panel);
    return FuzzyPanelController.fuzzyControllerSingleton;
  }

  /**
   * Assigns the active fuzzy provider, loads HTML, and sends the initial option list.
   * @param provider The provider responsible for options and preview logic.
   */
  public async setFuzzyProvider(provider: FuzzyFinderProvider) {
    console.log(`[FuzzyPanel] Setting provider of type "${provider.fuzzyAdapterType}"`);
    this.provider = provider;
    this.wvPanel.webview.html = await this.wvController.resolveWebviewHtml(this.provider.getHtmlLoadConfig());
    const items = await provider.querySelectableOptions();
    await this.sendResetWebviewEvent();
    await this.sendOptionsListEvent(items);
  }

  /**
   * Sends an event to the Webview instructing it to clear current preview data and current input search
   */
  private async sendResetWebviewEvent() {
    console.log(`[FuzzyPanel] Sending ClearPreview event`);
    await this.wvController.sendMessage({
      type: "resetWebview",
    });
  }

  /**
   * Sends a new list of selectable options to the Webview.
   * @param options fuzzy-selectable items.
   */
  private async sendOptionsListEvent(options: any) {
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
  public async sendThemeUpdateEvent(theme: string) {
    await this.wvController.sendMessage({
      type: "themeUpdate",
      data: { theme },
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
          const userTheme = getShikiTheme(Globals.USER_THEME);
          await this.sendThemeUpdateEvent(userTheme);
          const items = await this.provider.querySelectableOptions();
          await this.sendOptionsListEvent(items);
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
            await this.sendOptionsListEvent(results);
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
  private dispose() {
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
