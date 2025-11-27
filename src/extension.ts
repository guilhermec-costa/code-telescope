import { FuzzyPanel } from "./fuzzy-panel";
import { Globals } from "./globals";
import type { ExtensionCtx } from "./types";
import { getCmdId, registerAndSubscribeCmd } from "./utils/commands";

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
          console.log(files);
        }
      });
    },
    context,
  );
}

export function deactivate() {}
