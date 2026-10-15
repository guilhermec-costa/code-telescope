import * as vscode from "vscode";
import { resolvePathExt } from "../../utils/files";

export class FileReader {
  static async read(absPath: string): Promise<string | Uint8Array> {
    const ext = resolvePathExt(absPath);
    const isImg = ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext);

    const uri = vscode.Uri.file(absPath);
    const bytes = await vscode.workspace.fs.readFile(uri);

    if (isImg) return new Uint8Array(bytes);
    return new TextDecoder("utf-8").decode(bytes);
  }
}
