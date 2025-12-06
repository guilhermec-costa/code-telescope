import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../shared/extension-webview-protocol";
import { FuzzyProvider } from "../finders/fuzzy-provider";
import { Globals } from "../globals";
import { getShikiTheme } from "../syntax-highlight/shiki-utils";
import { execCmd } from "../utils/commands";
import { WebviewManager } from "./webview-util";

export class FuzzyPanel {
  public static currentPanel: FuzzyPanel | undefined;

  public readonly panel: vscode.WebviewPanel;
  private readonly wvManager: WebviewManager;
  private provider!: FuzzyProvider;

  private static revealPosition = vscode.ViewColumn.Active;

  private constructor(panel: vscode.WebviewPanel) {
    console.log("[FuzzyPanel] Creating a new panel instance");
    this.panel = panel;
    this.wvManager = new WebviewManager(this.panel.webview);
    this.listenWebview();

    panel.onDidDispose(() => {
      console.log("[FuzzyPanel] Panel disposed");
      FuzzyPanel.currentPanel = undefined;
    });
  }

  static createOrShow() {
    if (FuzzyPanel.currentPanel) {
      console.log("[FuzzyPanel] Reusing existing panel");
      FuzzyPanel.currentPanel.panel.reveal(this.revealPosition, false);
      return FuzzyPanel.currentPanel;
    }

    console.log("[FuzzyPanel] Creating a new WebviewPanel");
    const panel = vscode.window.createWebviewPanel(
      "code-telescope-fuzzy",
      "Telescope – Fuzzy Finder",
      {
        viewColumn: this.revealPosition,
        preserveFocus: false,
      },
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(Globals.EXTENSION_URI, "ui"),
          vscode.Uri.joinPath(Globals.EXTENSION_URI, "ui-dist"),
        ],
      },
    );

    FuzzyPanel.currentPanel = new FuzzyPanel(panel);
    return FuzzyPanel.currentPanel;
  }

  public async setProvider(provider: FuzzyProvider) {
    console.log(`[FuzzyPanel] Setting provider of type "${provider.fuzzyAdapterType}"`);
    this.provider = provider;
    this.panel.webview.html = await this.provider.loadWebviewHtml();
    const items = await provider.querySelectableOptions();
    await this.sendOptionsListEvent(items);
  }

  private async sendOptionsListEvent(options: any) {
    console.log(`[FuzzyPanel] Sending optionList event with ${options.length} options`);

    await this.wvManager.sendMessage({
      type: "optionList",
      data: options,
      finderType: this.provider.fuzzyAdapterType,
    });
  }

  public async emitThemeChangeEvent(theme: string) {
    await this.wvManager.sendMessage({
      type: "themeUpdate",
      data: { theme: theme },
    });
  }

  public listenWebview() {
    console.log("[FuzzyPanel] Listening for webview messages!!!!!!!!!!");
    this.wvManager.onMessage(async (msg: FromWebviewKindMessage) => {
      console.log(`[FuzzyPanel] Received message of type: ${msg.type}`);

      if (msg.type === "ready") {
        console.log("[FuzzyPanel] Webview is ready, sending initial options");
        const items = await this.provider.querySelectableOptions();
        await this.sendOptionsListEvent(items);
      }

      if (msg.type === "dynamicSearch") {
        if (this.provider.supportsDynamicSearch && this.provider.searchOptions) {
          const query = msg.data.query;
          const results = await this.provider.searchOptions(query);
          await this.sendOptionsListEvent(results);
        }
      }

      if (msg.type === "optionSelected") {
        this.dispose();
        const selected = msg.data;

        if (this.provider.onSelect) {
          await this.provider.onSelect(selected);
          return;
        }

        const uri = vscode.Uri.file(selected);
        await execCmd(Globals.cmds.openFile, uri);
      }

      if (msg.type === "closePanel") {
        this.dispose();
        await execCmd(Globals.cmds.focusActiveFile);
      }

      if (msg.type === "previewRequest") {
        console.log(`[FuzzyPanel] Preview requested for: ${msg.data}`);
        await this.handlePreviewRequest(msg.data);
      }
    });
  }

  private dispose() {
    console.log("[FuzzyPanel] Closing panel");
    this.panel.dispose();
  }

  private async handlePreviewRequest(identifier: string) {
    console.log(`[FuzzyPanel] Getting preview data for: ${identifier}`);
    const previewData = await this.provider.getPreviewData(identifier);
    const shikiTheme = getShikiTheme(Globals.USER_THEME);

    console.log("[FuzzyPanel] Sending previewUpdate event");
    await this.wvManager.sendMessage({
      type: "previewUpdate",
      previewAdapterType: this.provider.previewAdapterType,
      data: previewData,
      theme: shikiTheme,
    });
  }
}
