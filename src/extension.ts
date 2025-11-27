import { FuzzyPanel } from "./fuzzy-panel";
import { Globals } from "./globals";
import type { ExtensionCtx } from "./types";
import { getCmdId, registerAndSubscribeCmd } from "./utils/commands";
import * as vscode from "vscode";

export function activate(context: ExtensionCtx) {
  console.log(`${Globals.EXTENSION_NAME} activated!`);
  Globals.EXTENSION_URI = context.extensionUri;

  registerAndSubscribeCmd(
    getCmdId("fuzzy"),
    async () => {
      const panel = FuzzyPanel.createOrShow();
      FuzzyPanel.currentPanel?.panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.type === "ready") {
          const files = await panel.wsFinder.findFilePaths();
          panel.panel.webview.postMessage({
            type: "fileList",
            data: files,
          });
        }

        if (msg.type === "fileSelected") {
          const uri = vscode.Uri.file(msg.payload);
          vscode.commands.executeCommand("vscode.open", uri);
        }
      });
    },
    context,
  );
}

export function deactivate() {}
