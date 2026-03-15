import { StashInfo } from "../../../../shared/exchange/stash";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { execAsync } from "../../../utils/commands";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../../decorators/fuzzy-finder-provider.decorator";
import { getGitRoots } from "./api-utils";

@FuzzyFinderAdapter({
  fuzzy: "git.stashes",
  previewRenderer: "preview.buffer",
  dataAdapter: "gitStashesAdapter",
  name: "Git Stashes",
  description: "Search and apply Git stashes",
})
export class GitStashFinder implements FuzzyFinderProvider {
  async querySelectableOptions(): Promise<StashInfo[]> {
    const repos = await getGitRoots();
    if (repos.length === 0) return [];

    const showRepoName = repos.length > 1;

    const results = await Promise.allSettled(
      repos.map(async (repo) => {
        const { stdout } = await execAsync(`git stash list --format="%gd|%s"`, { cwd: repo.path });

        return stdout
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line): StashInfo => {
            const pipeIndex = line.indexOf("|");
            const ref = pipeIndex !== -1 ? line.slice(0, pipeIndex) : line;
            const message = pipeIndex !== -1 ? line.slice(pipeIndex + 1) : line;

            // stash@{n} → extract n
            const match = ref.match(/stash@\{(\d+)\}/);
            const index = match ? parseInt(match[1], 10) : 0;

            return {
              index,
              message,
              repoPath: repo.path,
              repoName: showRepoName ? repo.name : undefined,
            };
          });
      }),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<StashInfo[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);
  }

  async onSelect(stash: StashInfo): Promise<void> {
    try {
      await execAsync(`git stash apply stash@{${stash.index}}`, { cwd: stash.repoPath });
    } catch (e) {
      console.error("[GitStashFinder] apply error:", e);
    }
  }

  async getPreviewData(stash: StashInfo): Promise<TextPreviewData> {
    try {
      const { stdout } = await execAsync(`git stash show -p stash@{${stash.index}} --no-color`, {
        cwd: stash.repoPath,
      });
      return { content: stdout, kind: "text", language: "diff" };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        return { content: "git not found in PATH.", kind: "text", language: "plaintext" };
      }
      console.error("[GitStashFinder] getPreviewData error:", e);
      return { kind: "text", content: "" };
    }
  }
}
