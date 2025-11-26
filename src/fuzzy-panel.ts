import * as vscode from "vscode";
import { loadWebviewHtml, replaceRootDirStrInHtml } from "./utils/viewLoader";

export class FuzzyPanel {
  public static currentPanel: FuzzyPanel | undefined;

  private readonly panel: vscode.WebviewPanel;

  static createOrShow() {
    if (FuzzyPanel.currentPanel) {
      FuzzyPanel.currentPanel.panel.reveal(vscode.ViewColumn.Beside);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "code-telescope-fuzzy",
      "Telescope – Fuzzy Finder",
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    FuzzyPanel.currentPanel = new FuzzyPanel(panel);
  }

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;

    this._updateHtml();

    panel.webview.onDidReceiveMessage((msg) => {
      console.log(msg);
    });

    panel.onDidDispose(() => {
      FuzzyPanel.currentPanel = undefined;
    });
  }

  private async _updateHtml() {
    const rawHtml = await loadWebviewHtml("media/fuzzy/file-fuzzy.view.html");
    this.panel.webview.html = replaceRootDirStrInHtml(this.panel.webview, rawHtml, "media/fuzzy/");
  }
}
