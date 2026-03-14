import * as vscode from "vscode";
import { HarpoonMark } from "../../shared/exchange/harpoon";
import { djb2 } from "../utils/hash";

interface SerializedMark {
  uriString: string;
  label?: string;
  position?: { line: number; character: number };
}

export class HarpoonStorage {
  constructor(private readonly context: vscode.ExtensionContext) {}

  private getStorageUri(): vscode.Uri {
    const folder = vscode.workspace.workspaceFolders?.[0];
    const workspaceId = folder ? djb2(folder.uri.toString()) : "no-workspace";
    return vscode.Uri.joinPath(this.context.globalStorageUri, `harpoon-${workspaceId}.json`);
  }

  public async save(marks: HarpoonMark[]): Promise<void> {
    const uri = this.getStorageUri();

    const serialized: SerializedMark[] = marks.map((mark) => ({
      uriString: mark.uri.toString(),
      label: mark.label,
      position: mark.position ? { line: mark.position.line, character: mark.position.character } : undefined,
    }));

    const content = new TextEncoder().encode(JSON.stringify({ marks: serialized }, null, 2));

    await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);
    await vscode.workspace.fs.writeFile(uri, content);
  }

  public async load(): Promise<HarpoonMark[]> {
    const uri = this.getStorageUri();

    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const json = JSON.parse(new TextDecoder().decode(bytes));
      return (json.marks as SerializedMark[]).map((m) => ({
        uri: vscode.Uri.parse(m.uriString),
        label: m.label,
        position: m.position ? new vscode.Position(m.position.line, m.position.character) : undefined,
      }));
    } catch {
      return [];
    }
  }

  public async clearAllMarks(): Promise<void> {
    const uri = this.getStorageUri();
    try {
      await vscode.workspace.fs.delete(uri);
    } catch {}
  }
}
