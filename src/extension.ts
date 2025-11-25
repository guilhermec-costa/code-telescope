import * as vscode from "vscode";
import { CodeTelescopeGlobals } from "./globals";
import type { CmdCallback, ExtensionCtx } from "./types";

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
    () => {
      const panel = vscode.window.createWebviewPanel("code-telescope", "Telescope - File Fuzzy Finder", vscode.ViewColumn.Beside, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      vscode.window.showInformationMessage("code-telescope is started!");
      panel.title = "File Fuzzy Finder";
      panel.webview.html = "<h1>hello world</h1>";
    },
    context,
  );
}

export function deactivate() {}
