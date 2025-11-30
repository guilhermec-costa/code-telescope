import * as vscode from "vscode";
import { FuzzyProvider } from "../finders/fuzzy-provider";
import { WorkspaceFileFinder } from "../finders/workspace-files.finder";
import { Globals } from "../globals";
import { execCmd } from "../utils/commands";
import { getLanguageFromPath } from "../utils/files";
import { loadWebviewHtml } from "../utils/viewLoader";
import { WebviewManager } from "./webview-util";
import { getShikiTheme } from "../syntax-highlight/shiki-utils";
import { PreviewUpdateMessage, WebviewMessage } from "../../shared/extension-webview-protocol";

export class FuzzyPanel {
  public static currentPanel: FuzzyPanel | undefined;

  public readonly panel: vscode.WebviewPanel;
  private readonly wvManager: WebviewManager;
  private provider: FuzzyProvider = new WorkspaceFileFinder();

  static createOrShow() {
    if (FuzzyPanel.currentPanel) {
      FuzzyPanel.currentPanel.panel.reveal(vscode.ViewColumn.Active);
      return FuzzyPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "code-telescope-fuzzy",
      "Telescope – Fuzzy Finder",
      vscode.ViewColumn.Active,
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

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.wvManager = new WebviewManager(this.panel.webview);

    this._updateHtml();
    this.listenWebview();

    panel.onDidDispose(() => {
      FuzzyPanel.currentPanel = undefined;
    });
  }

  public async setProvider(provider: FuzzyProvider) {
    this.provider = provider;
    const items = await provider.querySelectableOptions();
    await this.sendOptionsListEvent(items);
  }

  private async sendOptionsListEvent(files: string[]) {
    await this.wvManager.sendMessage({
      type: "optionList",
      data: files,
    });
  }

  private async _updateHtml() {
    let rawHtml = await loadWebviewHtml("media-src", "fuzzy", "file-fuzzy.view.html");

    const replace = (search: string, distPath: string) => {
      const fullUri = this.panel.webview.asWebviewUri(vscode.Uri.joinPath(Globals.EXTENSION_URI, distPath));
      rawHtml = rawHtml.replace(search, fullUri.toString());
    };

    replace("{{style}}", "media-src/fuzzy/style.css");
    replace("{{script}}", "media-dist/fuzzy/index.js");

    this.panel.webview.html = rawHtml;
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
            data: { content: "[Unable to read file]" },
          });
        }
      }
    });
  }
}
