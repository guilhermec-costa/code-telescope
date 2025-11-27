import * as vscode from "vscode";
import { WorkspaceFileFinder } from "./finders/workspace-files.finder";
import { loadWebviewHtml, replaceRootDirStrInHtml } from "./utils/viewLoader";

export class FuzzyPanel {
  public static currentPanel: FuzzyPanel | undefined;

  public readonly panel: vscode.WebviewPanel;
  public readonly wsFinder: WorkspaceFileFinder;

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
    this.wsFinder = new WorkspaceFileFinder();

    this._updateHtml();

    panel.webview.onDidReceiveMessage((msg) => {
      console.log("Message from webview:", msg);
    });

    panel.onDidDispose(() => {
      FuzzyPanel.currentPanel = undefined;
    });
  }

  private async _updateHtml() {
    const rawHtml = await loadWebviewHtml("media", "fuzzy", "file-fuzzy.view.html");
    this.panel.webview.html = replaceRootDirStrInHtml(this.panel.webview, rawHtml, "media/fuzzy/");
  }
}
