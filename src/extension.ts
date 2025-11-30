import { VSCodeGitBranchFinder } from "./finders/vscode-git-branch.finder";
import { WorkspaceFileFinder } from "./finders/workspace-files.finder";
import { FuzzyPanel } from "./fuzzy/fuzzy-panel";
import { Globals } from "./globals";
import type { ExtensionCtx } from "./types";
import { getCmdId, registerAndSubscribeCmd } from "./utils/commands";

export function activate(context: ExtensionCtx) {
  console.log(`${Globals.EXTENSION_NAME} activated!`);
  Globals.EXTENSION_URI = context.extensionUri;

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "file"),
    async () => {
      const panel = FuzzyPanel.createOrShow();
      panel.setProvider(new WorkspaceFileFinder());
    },
    context,
  );

  registerAndSubscribeCmd(
    getCmdId("fuzzy", "branch"),
    async () => {
      const panel = FuzzyPanel.createOrShow();
      panel.setProvider(new VSCodeGitBranchFinder({ includeRemotes: true }));
    },
    context,
  );
}

export function deactivate() {}
