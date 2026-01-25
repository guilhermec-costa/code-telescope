import * as vscode from "vscode";
import { registerHarpoonCmd } from "../utils/commands";
import { HarpoonOrchestrator } from "./orchestrator";

export function registerHarpoonCmds(manager: HarpoonOrchestrator, ctx: vscode.ExtensionContext) {
  registerHarpoonCmd("addFile", () => manager.addFile(), ctx);
  registerHarpoonCmd("removeCurrentFile", () => manager.removeCurrentFile(), ctx);
  registerHarpoonCmd(
    "clear",
    async () => {
      const confirm = await vscode.window.showWarningMessage("Clear all Harpoon marks?", { modal: true }, "Clear");
      if (confirm === "Clear") {
        await manager.clearMarks();
      }
    },
    ctx,
  );

  for (let i = 1; i <= 9; i++) {
    registerHarpoonCmd(`gotoFile${i}`, () => manager.navigateTo(i - 1), ctx);
  }

  registerHarpoonCmd(
    "reorderMarks",
    async () => {
      const marks = manager.getMarks();

      if (marks.length <= 1) {
        vscode.window.showInformationMessage("Need at least 2 marks to reorder");
        return;
      }

      const markItems = marks.map((mark, index) => ({
        label: `$(bookmark) ${index + 1}`,
        description: vscode.workspace.asRelativePath(mark.uri),
        detail: mark.label,
        index,
      }));

      const selectedMark = await vscode.window.showQuickPick(markItems, {
        placeHolder: "Select mark to move",
      });

      if (!selectedMark) return;

      const positionItems = Array.from({ length: marks.length }, (_, i) => ({
        label: `Position ${i + 1}`,
        description:
          i === selectedMark.index ? "(current position)" : `Before: ${vscode.workspace.asRelativePath(marks[i].uri)}`,
        position: i,
      }));

      const targetPosition = await vscode.window.showQuickPick(positionItems, {
        placeHolder: `Move from position ${selectedMark.index + 1} to...`,
      });

      if (!targetPosition || targetPosition.position === selectedMark.index) {
        return;
      }

      await manager.reorder(selectedMark.index, targetPosition.position);
      vscode.window.showInformationMessage(
        `Moved mark from position ${selectedMark.index + 1} to ${targetPosition.position + 1}`,
      );
    },
    ctx,
  );

  registerHarpoonCmd(
    "editMark",
    async () => {
      const marks = manager.getMarks();

      if (marks.length === 0) {
        vscode.window.showInformationMessage("No marks to edit");
        return;
      }

      const items = marks.map((mark, index) => ({
        label: `$(bookmark) ${index + 1}. ${vscode.workspace.asRelativePath(mark.uri)}`,
        description: mark.label || `Line ${mark.position?.line ?? "?"}`,
        index,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select mark to edit",
      });

      if (!selected) return;

      const action = await vscode.window.showQuickPick(
        [
          {
            label: "$(trash) Remove",
            description: "Delete this mark",
            action: "remove" as const,
          },
          {
            label: "$(arrow-up) Move Up",
            description: "Move this mark earlier in the list",
            action: "moveUp" as const,
          },
          {
            label: "$(arrow-down) Move Down",
            description: "Move this mark later in the list",
            action: "moveDown" as const,
          },
          {
            label: "$(edit) Rename",
            description: "Change the label for this mark",
            action: "rename" as const,
          },
        ],
        {
          placeHolder: `Edit mark ${selected.index + 1}`,
        },
      );

      if (!action) return;

      switch (action.action) {
        case "remove":
          await manager.removeFile(selected.index);
          break;

        case "moveUp":
          if (selected.index === 0) {
            vscode.window.showInformationMessage("Mark is already at the top");
            return;
          }
          await manager.reorder(selected.index, selected.index - 1);
          vscode.window.showInformationMessage(`Moved mark to position ${selected.index}`);
          break;

        case "moveDown":
          if (selected.index === marks.length - 1) {
            vscode.window.showInformationMessage("Mark is already at the bottom");
            return;
          }
          await manager.reorder(selected.index, selected.index + 1);
          vscode.window.showInformationMessage(`Moved mark to position ${selected.index + 2}`);
          break;

        case "rename":
          const newLabel = await vscode.window.showInputBox({
            prompt: "Enter new label for this mark",
            value: marks[selected.index].label || "",
            placeHolder: "e.g., Main Component",
          });

          if (newLabel !== undefined) {
            await manager.updateLabel(selected.index, newLabel || undefined);
          }
          break;
      }
    },
    ctx,
  );
}
