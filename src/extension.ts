import * as vscode from "vscode";
import { CodeTelescopeGlobals } from "./globals";
import type { CmdCallback, ExtensionCtx } from "./types";
import { FuzzyPanel } from "./fuzzy-panel";

/**
 * Produces a command id based in a parts array
 */
function getCmdId(...parts: string[]) {
  return `${CodeTelescopeGlobals.EXTENSION_NAME}.${parts.join(".")}`;
}

function registerAndSubscribeCmd(cmdId: string, cb: CmdCallback, ctx: ExtensionCtx) {
  const cmdDisposable = vscode.commands.registerCommand(cmdId, cb);
  ctx.subscriptions.push(cmdDisposable);
}

export function activate(context: ExtensionCtx) {
  console.log(`${CodeTelescopeGlobals.EXTENSION_NAME} activated!`);

  registerAndSubscribeCmd(
    getCmdId("fuzzy"),
    async () => {
      FuzzyPanel.createOrShow(context);
    },
    context,
  );
}

export function deactivate() {}
