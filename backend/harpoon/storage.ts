import * as vscode from "vscode";
import { HarpoonMark } from "../../shared/exchange/harpoon";

interface SerializedMark {
  uriString: string;
  label?: string;
  position?: {
    line: number;
    character: number;
  };
}

export class HarpoonStorage {
  private static readonly STORAGE_KEY = "harpoon.marks";

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async save(marks: HarpoonMark[]): Promise<void> {
    const serialized: SerializedMark[] = marks.map((mark) => ({
      uriString: mark.uri.toString(),
      label: mark.label,
      position: mark.position
        ? {
            line: mark.position.line,
            character: mark.position.character,
          }
        : undefined,
    }));

    await this.context.workspaceState.update(HarpoonStorage.STORAGE_KEY, {
      marks: serialized,
    });
  }

  public async clearAllMarks(): Promise<void> {
    await this.context.workspaceState.update(HarpoonStorage.STORAGE_KEY, undefined);
  }
}
