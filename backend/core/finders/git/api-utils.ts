import * as vscode from "vscode";
import { execAsync } from "../../../utils/commands";

export async function getGitRoots() {
  const folders = vscode.workspace.workspaceFolders ?? [];

  const results = await Promise.allSettled(
    folders.map(async (folder) => {
      const { stdout } = await execAsync("git rev-parse --show-toplevel", { cwd: folder.uri.fsPath });
      return {
        path: stdout.trim(),
        name: folder.name,
      };
    }),
  );

  return results.filter((r): r is PromiseFulfilledResult<RepoRoot> => r.status === "fulfilled").map((r) => r.value);
}

export type RepoRoot = {
  path: string;
  name: string;
};
