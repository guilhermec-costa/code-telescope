import { GitBranchFinder } from "./finders/git-branch.finder";
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
      panel.listenWebview();
    },
    context,
  );

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "branch"),
    async () => {
      const finder = new GitBranchFinder();
      const branches = await finder.find({
        includeRemotes: true,
      });
      console.log(branches);
      vscode.window.showInformationMessage("Branch command called");
    },
    context,
  );
}

export function deactivate() {}
