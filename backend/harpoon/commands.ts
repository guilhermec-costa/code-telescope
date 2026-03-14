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
}
