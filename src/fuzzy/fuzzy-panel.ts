import * as vscode from "vscode";
import { PreviewUpdateMessage, WebviewMessage } from "../../shared/extension-webview-protocol";
import { FuzzyProvider } from "../finders/fuzzy-provider";
import { Globals } from "../globals";
import { getShikiTheme } from "../syntax-highlight/shiki-utils";
import { execCmd } from "../utils/commands";
import { getLanguageFromPath } from "../utils/files";
import { WebviewManager } from "./webview-util";

export class FuzzyPanel {
  public static currentPanel: FuzzyPanel | undefined;

  public readonly panel: vscode.WebviewPanel;
  private readonly wvManager: WebviewManager;
  private provider!: FuzzyProvider;

  private static revealPosition = vscode.ViewColumn.Active;

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.wvManager = new WebviewManager(this.panel.webview);
    this.listenWebview();

    panel.onDidDispose(() => {
      FuzzyPanel.currentPanel = undefined;
    });
  }

  static createOrShow() {
    if (FuzzyPanel.currentPanel) {
      FuzzyPanel.currentPanel.panel.reveal(this.revealPosition, false);
      return FuzzyPanel.currentPanel;
    }

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
          vscode.Uri.joinPath(Globals.EXTENSION_URI, "media-src"),
          vscode.Uri.joinPath(Globals.EXTENSION_URI, "media-dist"),
        ],
      },
    );

    FuzzyPanel.currentPanel = new FuzzyPanel(panel);
    return FuzzyPanel.currentPanel;
  }

  public async setProvider(provider: FuzzyProvider) {
    this.provider = provider;
    this.panel.webview.html = await this.provider.loadWebviewHtml();
    const items = await provider.querySelectableOptions();
    await this.sendOptionsListEvent(items);
  }

  private async sendOptionsListEvent(files: string[]) {
    await this.wvManager.sendMessage({
      type: "optionList",
      data: files,
    });
  }

  public async emitThemeChangeEvent(theme: string) {
    await this.wvManager.sendMessage({
      type: "themeUpdate",
      data: { theme: theme },
    });
  }

  public listenWebview() {
    this.wvManager.onMessage(async (msg: WebviewMessage) => {
      if (msg.type === "ready") {
        const items = await this.provider.querySelectableOptions();
        await this.sendOptionsListEvent(items);
      }

      if (msg.type === "optionSelected") {
        const selected = msg.data;

        if (this.provider.onSelect) {
          await this.provider.onSelect(selected);
          return;
        }

        const uri = vscode.Uri.file(selected);
        await execCmd(Globals.cmds.openFile, uri);
      }

      if (msg.type === "closePanel") {
        this.panel.dispose();
        await execCmd(Globals.cmds.focusActiveFile);
      }

      if (msg.type === "previewRequest") {
        const uri = vscode.Uri.file(msg.data);

        try {
          const contentBytes = await vscode.workspace.fs.readFile(uri);
          const content = new TextDecoder("utf8").decode(contentBytes);
          const language = getLanguageFromPath(msg.data);

          const shikiTheme = getShikiTheme(Globals.USER_THEME);
          await this.wvManager.sendMessage({
            type: "previewUpdate",
            data: { content, language, filePath: msg.data, theme: shikiTheme },
          } as PreviewUpdateMessage);
        } catch (_err) {
          await this.wvManager.sendMessage({
            type: "previewUpdate",
            data: { content: "[Unable to read file]", language: "", theme: "" },
          });
        }
      }
    });
  }
}
