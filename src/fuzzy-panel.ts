import * as vscode from "vscode";
import { FuzzyProvider } from "./finders/fuzzy-provider";
import { WorkspaceFileFinder } from "./finders/workspace-files.finder";
import { loadWebviewHtml, replaceRootDirStrInHtml } from "./utils/viewLoader";

export class FuzzyPanel {
  public static currentPanel: FuzzyPanel | undefined;

  public readonly panel: vscode.WebviewPanel;

  private provider: FuzzyProvider = new WorkspaceFileFinder();

  static createOrShow() {
    if (FuzzyPanel.currentPanel) {
      FuzzyPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      return FuzzyPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      "code-telescope-fuzzy",
      "Telescope – Fuzzy Finder",
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    FuzzyPanel.currentPanel = new FuzzyPanel(panel);
    return FuzzyPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;

    this._updateHtml();
    this.listenWebview();

    panel.onDidDispose(() => {
      FuzzyPanel.currentPanel = undefined;
    });
  }

  public async setProvider(provider: FuzzyProvider) {
    this.provider = provider;

    const items = await provider.findSelectableOptions();
    this.sendItems(items);
  }

  private async _updateHtml() {
    const rawHtml = await loadWebviewHtml("media", "fuzzy", "file-fuzzy.view.html");
    this.panel.webview.html = replaceRootDirStrInHtml(this.panel.webview, rawHtml, "media/fuzzy/");
  }

  public listenWebview() {
    this.panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "ready") {
        const items = await this.provider.findSelectableOptions();
        this.sendItems(items);
      }

      if (msg.type === "fileSelected") {
        const selected = msg.payload;

        if (this.provider.onSelect) {
          await this.provider.onSelect(selected);
          return;
        }

        const uri = vscode.Uri.file(selected);
        vscode.commands.executeCommand("vscode.open", uri);
      }
    });
  }

  private sendItems(items: string[]) {
    this.panel.webview.postMessage({
      type: "fileList",
      data: items,
    });
  }
}
