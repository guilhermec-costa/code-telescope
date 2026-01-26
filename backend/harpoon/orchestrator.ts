import * as vscode from "vscode";
import { HarpoonMark } from "../../shared/exchange/harpoon";
import { HarpoonStorage } from "./storage";

/**
 * Main Harpoon API - manages quick file bookmarks with index-based navigation
 */
export class HarpoonOrchestrator {
  private static instance: HarpoonOrchestrator;
  private marks: HarpoonMark[] = [];
  private storage: HarpoonStorage;

  private constructor(private context: vscode.ExtensionContext) {
    this.storage = new HarpoonStorage(context);
  }

  public static getInstance(context: vscode.ExtensionContext): HarpoonOrchestrator {
    if (!HarpoonOrchestrator.instance) {
      HarpoonOrchestrator.instance = new HarpoonOrchestrator(context);
    }
    return HarpoonOrchestrator.instance;
  }

  /**
   * Adds current file to marks list
   * If file already exists, updates its position
   */
  public async addFile(uri?: vscode.Uri, position?: vscode.Position): Promise<boolean> {
    const activeEditor = vscode.window.activeTextEditor;
    const targetUri = uri || activeEditor?.document.uri;
    if (!targetUri) {
      vscode.window.showWarningMessage("No file to mark");
      return false;
    }

    const existingIndex = this.marks.findIndex((m) => m.uri.toString() === targetUri.toString());
    const cursorPosition = position || activeEditor?.selection.active;

    if (existingIndex !== -1) {
      if (cursorPosition) {
        this.marks[existingIndex].position = cursorPosition;
      }
      vscode.window.showInformationMessage(`File already marked at position ${existingIndex + 1}. Position updated.`);
      this.persist();
      return true;
    }

    const mark: HarpoonMark = {
      uri: targetUri,
      position: cursorPosition,
    };

    this.marks.push(mark);
    await this.persist();

    vscode.window.showInformationMessage(`Marked file at position ${this.marks.length}`);
    return true;
  }

  public async removeFile(index: number): Promise<boolean> {
    if (index < 0 || index >= this.marks.length) {
      vscode.window.showWarningMessage(`Invalid mark index: ${index + 1}`);
      return false;
    }

    const removed = this.marks.splice(index, 1)[0];
    await this.persist();

    const fileName = vscode.workspace.asRelativePath(removed.uri);
    vscode.window.showInformationMessage(`Removed mark: ${fileName}`);
    return true;
  }

  public async removeCurrentFile(): Promise<boolean> {
    const currentUri = vscode.window.activeTextEditor?.document.uri;
    if (!currentUri) {
      vscode.window.showWarningMessage("No active file");
      return false;
    }

    const index = this.marks.findIndex((m) => m.uri.toString() === currentUri.toString());
    if (index === -1) {
      vscode.window.showWarningMessage("Current file is not marked");
      return false;
    }

    return this.removeFile(index);
  }

  public async navigateTo(index: number): Promise<boolean> {
    if (index < 0 || index >= this.marks.length) {
      vscode.window.showWarningMessage(`No mark at position ${index + 1}. Current marks: ${this.marks.length}`);
      return false;
    }

    const mark = this.marks[index];
    try {
      const document = await vscode.workspace.openTextDocument(mark.uri);
      const editor = await vscode.window.showTextDocument(document);

      if (mark.position) {
        editor.selection = new vscode.Selection(mark.position, mark.position);
        editor.revealRange(new vscode.Range(mark.position, mark.position), vscode.TextEditorRevealType.InCenter);
      }

      return true;
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open marked file: ${error}`);
      return false;
    }
  }

  public getMarks(): readonly HarpoonMark[] {
    return [...this.marks];
  }

  public async reorder(fromIndex: number, toIndex: number): Promise<boolean> {
    if (fromIndex < 0 || fromIndex >= this.marks.length || toIndex < 0 || toIndex >= this.marks.length) {
      vscode.window.showWarningMessage("Invalid reorder indices");
      return false;
    }

    const [mark] = this.marks.splice(fromIndex, 1);
    this.marks.splice(toIndex, 0, mark);

    await this.persist();
    return true;
  }

  public async clearMarks(): Promise<void> {
    this.marks = [];
    await this.persist();
    vscode.window.showInformationMessage("Cleared all harpoon marks");
  }

  public async persist(): Promise<void> {
    await this.storage.save(this.marks);
  }

  public async updateLabel(index: number, label?: string): Promise<boolean> {
    if (index < 0 || index >= this.marks.length) {
      vscode.window.showWarningMessage(`Invalid mark index: ${index + 1}`);
      return false;
    }

    this.marks[index].label = label;
    await this.persist();

    const fileName = vscode.workspace.asRelativePath(this.marks[index].uri);
    vscode.window.showInformationMessage(
      label ? `Updated label for ${fileName}: "${label}"` : `Removed label from ${fileName}`,
    );
    return true;
  }

  public getMarkCount() {
    return this.marks.length;
  }

  public isMarked(uri: vscode.Uri): boolean {
    return this.marks.some((m) => m.uri.toString() === uri.toString());
  }

  public getMarkIndex(uri: vscode.Uri): number {
    return this.marks.findIndex((m) => m.uri.toString() === uri.toString());
  }
}
