import * as vscode from "vscode";
import { CodeTelescopeGlobals } from "./globals";
import { CmdCallback, ExtCtx } from "./types";

function getCmdId(cmdName: string) {
  return `${CodeTelescopeGlobals.EXTENSION_NAME}.${cmdName}`;
}

function registerAndSubscribeCmd(cmdId: string, cb: CmdCallback, ctx: ExtCtx) {
  const cmdDisposable = vscode.commands.registerCommand(getCmdId("health"), () => {
    vscode.window.showInformationMessage("code-telescope is running");
  });
  ctx.subscriptions.push(cmdDisposable);
}

export function activate(context: ExtCtx) {
  console.log(`${CodeTelescopeGlobals.EXTENSION_NAME} activated!`);
  const healthCommandId = getCmdId("health");

  registerAndSubscribeCmd(
    healthCommandId,
    () => {
      vscode.window.showInformationMessage("code-telescope is running");
    },
    context,
  );
}

export function deactivate() {}
