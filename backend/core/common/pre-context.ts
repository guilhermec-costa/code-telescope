import * as vscode from "vscode";

export class PreContextManager {
  private static _instance: PreContextManager;

  static get instance(): PreContextManager {
    if (!this._instance) {
      this._instance = new PreContextManager();
    }
    return this._instance;
  }

  private document?: vscode.TextDocument;
  private position?: vscode.Position;

  captureFromActiveEditor(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    this.document = editor.document;
    this.position = editor.selection.active;
  }

  getContext(): { document: vscode.TextDocument; position: vscode.Position } | null {
    if (!this.document || !this.position) return null;
    return {
      document: this.document,
      position: this.position,
    };
  }

  async focusOnCapture() {
    const ctx = PreContextManager.instance.getContext();
    if (ctx) {
      const { document, position } = ctx;
      await vscode.workspace.openTextDocument(document.uri);
      const editor = await vscode.window.showTextDocument(document);

      editor.selection = new vscode.Selection(position, position);
    }
  }

  clear(): void {
    this.document = undefined;
    this.position = undefined;
  }
}
