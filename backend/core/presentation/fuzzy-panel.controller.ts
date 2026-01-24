import * as vscode from "vscode";
import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { FromWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { Globals } from "../../globals";
import { joinPath } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { PreContextManager } from "../common/pre-context";
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
        preserveFocus: false,
      },
      {
        retainContextWhenHidden: true,
        enableScripts: true,
        localResourceRoots: [
          joinPath(Globals.EXTENSION_URI, "ui"),
          joinPath(Globals.EXTENSION_URI, "ui/dist"),
          joinPath(Globals.EXTENSION_URI, "node_modules/material-icon-theme/icons"),
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
    FuzzyFinderPanelController._instance.listenWebview();
    return FuzzyFinderPanelController._instance;
  }

  public static async setupProvider(providerType: FuzzyProviderType) {
    PreContextManager.instance.captureFromActiveEditor();
    const instance = FuzzyFinderPanelController.createOrShow();
    await instance.startProvider(providerType);
  }

  public async startProvider(providerType: FuzzyProviderType) {
    const provider = FuzzyFinderAdapterRegistry.instance.getAdapter(providerType);
    if (!provider) {
      this.dispose();
      await vscode.window.showErrorMessage("Failed to start provider: ", providerType);
      return;
    }

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

  public get webview() {
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
  public async dispose() {
    console.log("[FuzzyPanel] Closing panel");
    this.wvPanel.dispose();
  }
}
