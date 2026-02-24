import * as vscode from "vscode";
import { resolvePathExt } from "../../utils/files";

export class FileReader {
  private static _instance: FileReader | undefined;

  private cache = new Map<string, string | Uint8Array>();

  private constructor() {}

  static get instance() {
    if (!this._instance) {
      this._instance = new FileReader();
    }
    return this._instance;
  }

  invalidate(absPath: string): void {
    this.cache.delete(absPath);
  }

  static async read(absPath: string): Promise<string | Uint8Array> {
    const ext = resolvePathExt(absPath);
    const isImg = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

    const uri = vscode.Uri.file(absPath);
    const bytes = await vscode.workspace.fs.readFile(uri);

    if (isImg) return new Uint8Array(bytes);
    return new TextDecoder("utf-8").decode(bytes);
  }
}
