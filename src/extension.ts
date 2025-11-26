import { FuzzyPanel } from "./fuzzy-panel";
import { Globals } from "./globals";
import type { ExtensionCtx } from "./types";
import { getCmdId, registerAndSubscribeCmd } from "./utils/commands";

export function activate(context: ExtensionCtx) {
  console.log(`${Globals.EXTENSION_NAME} activated!`);
  Globals.EXTENSION_URI = context.extensionUri;

  registerAndSubscribeCmd(
    getCmdId("fuzzy"),
    () => {
      FuzzyPanel.createOrShow();
    },
    context,
  );
}

export function deactivate() {}
