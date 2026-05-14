import * as vscode from "vscode";

type TContext = {
  document: vscode.TextDocument | null;
  position: vscode.Position | null;
  selectedText: string;
};

type TCapturedContext = {
  document: vscode.TextDocument;
  position: vscode.Position;
  selectedText: string;
};

export class PreContextManager {
  private static _instance: PreContextManager;

  private _ctx: TContext = {
    document: null,
    position: null,
    selectedText: "",
  };

  private constructor() {}

  static get instance(): PreContextManager {
    if (!this._instance) {
      this._instance = new PreContextManager();
    }

    return this._instance;
  }

  captureFromActiveEditor(): void {
    const editor = vscode.window.activeTextEditor;

    if (!editor) return;

    this._ctx.document = editor.document;
    this._ctx.position = editor.selection.active;
    this._ctx.selectedText = editor.document.getText(editor.selection);
  }

  getContext(): TCapturedContext | null {
    if (!this._ctx.document || !this._ctx.position) {
      return null;
    }

    return this._ctx as TCapturedContext;
  }

  async focusOnCapture() {
    const ctx = this.getContext();

    if (!ctx) return;

    const { document, position } = ctx;

    await vscode.workspace.openTextDocument(document.uri);

    const editor = await vscode.window.showTextDocument(document);

    editor.selection = new vscode.Selection(position, position);

    return editor;
  }

  clear(): void {
    this._ctx = {
      document: null,
      position: null,
      selectedText: "",
    };
  }
}
