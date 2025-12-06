import * as vscode from "vscode";
import { Globals } from "../globals";
import { CmdCallback, ExtensionCtx } from "../types";

/**
 * Produces a command id based in a parts array
 */
export function getCmdId(...parts: string[]) {
  return `${Globals.EXTENSION_NAME}.${parts.join(".")}`;
}

export function registerAndSubscribeCmd(cmdId: string, cb: CmdCallback, ctx: ExtensionCtx) {
  const cmdDisposable = vscode.commands.registerCommand(cmdId, cb);
  ctx.subscriptions.push(cmdDisposable);
}

export async function execCmd(cmd: string, ...rest: any[]) {
  return await vscode.commands.executeCommand(cmd, ...rest);
}
