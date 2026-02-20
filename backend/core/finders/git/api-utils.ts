import * as vscode from "vscode";
import { GitExtension } from "../../../@types/git";

/**
 * Loads the Git extension and returns its exposed API instance.
 * If the extension is unavailable, `null` is returned.
 */
export async function getGitApi() {
  const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git");
  if (!gitExtension) return null;

  if (!gitExtension.isActive) {
    await gitExtension.activate();
  }

  return gitExtension.exports.getAPI(1);
}
