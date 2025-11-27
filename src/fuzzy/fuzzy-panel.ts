import * as vscode from "vscode";
import { FuzzyProvider } from "../finders/fuzzy-provider";
import { WorkspaceFileFinder } from "../finders/workspace-files.finder";
import { loadWebviewHtml, replaceRootDirStrInHtml } from "../utils/viewLoader";
import { WebviewManager } from "./webview-util";

export class FuzzyPanel {
  public static currentPanel: FuzzyPanel | undefined;

  public readonly panel: vscode.WebviewPanel;
  private readonly wvManager: WebviewManager;
  private provider: FuzzyProvider = new WorkspaceFileFinder();

  static createOrShow() {
    if (FuzzyPanel.currentPanel) {
      FuzzyPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      return FuzzyPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "code-telescope-fuzzy",
      "Telescope – Fuzzy Finder",
      vscode.ViewColumn.One,
      { enableScripts: true },
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
    await this.sendFileListEvent(items);
  }

  private async sendFileListEvent(files: string[]) {
    await this.wvManager.sendMessage({
      type: "fileList",
      data: files,
    });
  }

  private async _updateHtml() {
    const rawHtml = await loadWebviewHtml("media", "fuzzy", "file-fuzzy.view.html");
    this.panel.webview.html = replaceRootDirStrInHtml(this.panel.webview, rawHtml, "media/fuzzy/");
  }

  public listenWebview() {
    this.panel.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
      if (msg.type === "ready") {
        const items = await this.provider.querySelectableOptions();
        await this.sendFileListEvent(items);
      }

      if (msg.type === "fileSelected") {
        const selected = msg.data;

        if (this.provider.onSelect) {
          await this.provider.onSelect(selected);
          return;
        }

        const uri = vscode.Uri.file(selected);
        vscode.commands.executeCommand("vscode.open", uri);
      }

      if (msg.type === "closePanel") {
        this.panel.dispose();
      }

      if (msg.type === "previewRequest") {
        const uri = vscode.Uri.file(msg.data);

        try {
          const contentBytes = await vscode.workspace.fs.readFile(uri);
          const content = new TextDecoder("utf8").decode(contentBytes);

          await this.wvManager.sendMessage({
            type: "previewUpdate",
            data: { content },
          });
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
