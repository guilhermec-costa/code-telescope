import * as vscode from "vscode";
import { Globals } from "../globals";

/**
 * Produces a command id based in a parts array
 */
export function getCmdId(...parts: string[]) {
  return `${Globals.EXTENSION_NAME}.${parts.join(".")}`;
}

export function registerAndSubscribeCmd(cmdId: string, cb: () => void, ctx: vscode.ExtensionContext) {
  const cmdDisposable = vscode.commands.registerCommand(cmdId, cb);
  ctx.subscriptions.push(cmdDisposable);
}

export function registerProviderCmd(fuzzyName: string, cb: () => void, ctx: vscode.ExtensionContext) {
  registerAndSubscribeCmd(getCmdId("fuzzy", fuzzyName), cb, ctx);
}

export async function execCmd(cmd: string, ...rest: any[]) {
  return await vscode.commands.executeCommand(cmd, ...rest);
}
