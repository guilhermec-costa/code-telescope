import * as vscode from "vscode";
import { loadWebviewHtml, replaceRootDirStr } from "./utils/viewLoader";

export class FuzzyPanel {
  public static currentPanel: FuzzyPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;

  static createOrShow(context: vscode.ExtensionContext) {
    if (FuzzyPanel.currentPanel) {
      FuzzyPanel.currentPanel.panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "code-telescope-fuzzy",
      "Telescope – Fuzzy Finder",
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    FuzzyPanel.currentPanel = new FuzzyPanel(panel, context);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this.panel = panel;
    this.extensionUri = context.extensionUri;

    this._updateHtml();

    panel.webview.onDidReceiveMessage((msg) => {
      console.log(msg);
    });

    panel.onDidDispose(() => {
      FuzzyPanel.currentPanel = undefined;
    });
  }

  private async _updateHtml() {
    const rawHtml = await loadWebviewHtml(this.extensionUri, "media/fuzzy/file-fuzzy.view.html");
    this.panel.webview.html = replaceRootDirStr(
      this.panel.webview,
      this.extensionUri,
      "media/fuzzy/",
      rawHtml,
    );
  }
}
