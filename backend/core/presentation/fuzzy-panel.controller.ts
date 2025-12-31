import * as vscode from "vscode";
import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { FromWebviewKindMessage, InitHighlighter } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { joinPath } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { EventManager } from "../common/events/event-manager";
import { FuzzyFinderAdapterRegistry } from "../registry/fuzzy-provider.registry";
import { WebviewMessageHandlerRegistry } from "../registry/webview-handler.registry";
import { WebviewController } from "./webview.controller";

/**
 * Handles communication between backend (extension) and frontend (Webview UI)
 */
export class FuzzyFinderPanelController {
  public readonly wvPanel: vscode.WebviewPanel;
  private static _instance: FuzzyFinderPanelController | undefined;

  private static panelRevealPosition = vscode.ViewColumn.Active;
  private _provider!: IFuzzyFinderProvider;

  private constructor(_wvPanel: vscode.WebviewPanel) {
    console.log("[FuzzyPanel] Creating a new panel instance");
    this.wvPanel = _wvPanel;

    _wvPanel.onDidDispose(() => {
      console.log("[FuzzyPanel] Panel disposed");
      FuzzyFinderPanelController._instance = undefined;
    });
  }

  public static get instance() {
    return this._instance;
  }

  public get provider() {
    return this._provider;
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
    if (FuzzyFinderPanelController._instance) {
      console.log("[FuzzyPanel] Reusing existing panel");
      FuzzyFinderPanelController._instance.wvPanel.reveal(this.panelRevealPosition, false);
      return FuzzyFinderPanelController._instance;
    }

    const panel = this.createPanel();
    FuzzyFinderPanelController._instance = new FuzzyFinderPanelController(panel);
    EventManager.init();
    FuzzyFinderPanelController._instance.listenWebview();
    return FuzzyFinderPanelController._instance;
  }

  public static async setupProvider(providerType: FuzzyProviderType) {
    const instance = FuzzyFinderPanelController.createOrShow();
    await instance.startProvider(providerType);
  }

  public async startProvider(providerType: FuzzyProviderType) {
    const provider = FuzzyFinderAdapterRegistry.instance.getAdapter(providerType);
    if (!provider) {
      await vscode.window.showErrorMessage("Failed to start provider: ", providerType);
      return;
    }
    if (this._provider && this._provider.fuzzyAdapterType === providerType) return;

    this.setFuzzyProvider(provider);
    this.wvPanel.webview.html = await WebviewController.resolveProviderWebviewHtml(this.webview, this._provider);

    await this.emitResetWebviewEvent();
  }

  /**
   * Assigns the active fuzzy provider, loads HTML, and sends the initial option list.
   * @param provider The provider responsible for options and preview logic.
   */
  private async setFuzzyProvider(provider: IFuzzyFinderProvider) {
    console.log(`[FuzzyPanel] Setting provider of type "${provider.fuzzyAdapterType}"`);
    this._provider = provider;
  }

  private get webview() {
    return this.wvPanel.webview;
  }

  /**
   * Sends an event to the Webview instructing it to clear current preview data and current input search
   */
  private async emitResetWebviewEvent() {
    console.log(`[FuzzyPanel] Sending ClearPreview event`);
    await WebviewController.sendMessage(this.webview, {
      type: "resetWebview",
    });
  }

  /**
   * Sends a theme change/update event to the Webview.
   * @param theme Shiki-compatible theme name (e.g., "dark-plus").
   */
  public async emitThemeUpdateEvent(theme: string) {
    await WebviewController.sendMessage(this.webview, {
      type: "themeUpdate",
      data: { theme },
    });
  }

  public async emitInitShikiEvent(data: InitHighlighter["data"]) {
    await WebviewController.sendMessage(this.webview, {
      type: "highlighterInit",
      data,
    });
  }

  /**
   * Sets up event listeners for messages sent from the Webview UI.
   */
  public listenWebview() {
    console.log("[FuzzyPanel] Listening for webview messages");
    WebviewController.receiveMessage(this.webview, async (msg: FromWebviewKindMessage) => {
      console.log(`[FuzzyPanel] Received message of type: ${msg.type}`);
      const handler = WebviewMessageHandlerRegistry.instance.getAdapter(msg.type);
      if (!handler) {
        console.log("No handler found");
        return;
      }

      await handler.handle(msg, this.webview);
    });
  }

  /**
   * Disposes (closes) the current panel.
   */
  public dispose() {
    console.log("[FuzzyPanel] Closing panel");
    this.wvPanel.dispose();
  }
}
