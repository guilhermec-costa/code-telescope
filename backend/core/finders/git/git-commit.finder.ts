import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { API, Change, Repository, Status } from "../../../@types/git";
import { execCmd } from "../../../utils/commands";
import { IFuzzyFinderProvider } from "../../abstractions/fuzzy-finder.provider";
import { FuzzyFinderAdapter } from "../../decorators/fuzzy-finder-provider.decorator";
import { getGitApi } from "./api-utils";

@FuzzyFinderAdapter({
  fuzzy: "git.commits",
  previewRenderer: "preview.commitDiff",
})
export class GitCommitFuzzyFinderProvider implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  private readonly gitApi: API | null;
  private repository: Repository | null = null;

  constructor(private readonly maxCommits: number = 100) {
    this.gitApi = getGitApi();
    this.repository = this.gitApi?.repositories[0] || null;
  }

  getHtmlLoadConfig() {
    return {
      fileName: "file-fuzzy.view.html",
      placeholders: {
        "{{style}}": "ui/style/style.css",
        "{{script}}": "ui/dist/index.js",
      },
    };
  }

  async querySelectableOptions() {
    if (!this.repository) {
      return { commits: [] };
    }

    try {
      const commits = await this.repository.log({
        maxEntries: this.maxCommits,
      });

      return {
        commits: commits.map((commit) => ({
          hash: commit.hash,
          message: this.getFirstLine(commit.message),
          fullMessage: commit.message,
          author: commit.authorName || "Unknown",
          authorEmail: commit.authorEmail || "",
          date: commit.authorDate?.toISOString() || new Date().toISOString(),
          parents: commit.parents || [],
        })),
      };
    } catch (error) {
      console.error("Failed to get commits:", error);
      return { commits: [] };
    }
  }

  async getPreviewData(commitHash: string): Promise<PreviewData> {
    if (!this.repository) {
      return {
        content: "Git repository not found",
        language: "text",
      };
    }

    try {
      const commits = await this.repository.log({ maxEntries: this.maxCommits });
      const commit = commits.find((c) => c.hash === commitHash);
      const changes = await this.repository.diffWith(commitHash);
      const diff = await this.generateDiffText(changes, commitHash);

      if (!commit) {
        return {
          content: "Commit not found",
          language: "text",
        };
      }

      const content = [
        `commit ${commit.hash}`,
        `Author: ${commit.authorName} <${commit.authorEmail}>`,
        `Date:   ${commit.authorDate?.toLocaleString()}`,
        ``,
        `    ${commit.message}`,
        ``,
        diff || "(no changes)",
      ].join("\n");

      return {
        content,
        language: "diff",
      };
    } catch (error) {
      return {
        content: `Failed to load commit diff: ${error}`,
        language: "text",
      };
    }
  }

  private async generateDiffText(changes: Change[], commitHash: string): Promise<string> {
    if (!this.repository || changes.length === 0) {
      return "";
    }

    const diffParts: string[] = [];

    for (const change of changes.slice(0, 10)) {
      const statusSymbol = this.getStatusSymbol(change.status);
      const filePath = vscode.workspace.asRelativePath(change.uri);

      diffParts.push(`diff --git a/${filePath} b/${filePath}`);

      switch (change.status) {
        case Status.DELETED:
          diffParts.push(`deleted file mode 100644`);
          diffParts.push(`--- a/${filePath}`);
          diffParts.push(`+++ /dev/null`);
          try {
            const content = await this.repository.show(commitHash + "^", change.uri.fsPath);
            const lines = content.split("\n");
            diffParts.push(`@@ -1,${lines.length} +0,0 @@`);
            lines.forEach((line) => diffParts.push(`-${line}`));
          } catch {}
          break;

        case Status.INDEX_ADDED:
        case Status.UNTRACKED:
          diffParts.push(`new file mode 100644`);
          diffParts.push(`--- /dev/null`);
          diffParts.push(`+++ b/${filePath}`);
          try {
            const content = await this.repository.show(commitHash, change.uri.fsPath);
            const lines = content.split("\n");
            diffParts.push(`@@ -0,0 +1,${lines.length} @@`);
            lines.forEach((line) => diffParts.push(`+${line}`));
          } catch {}
          break;

        case Status.MODIFIED:
        case Status.INDEX_MODIFIED:
          diffParts.push(`--- a/${filePath}`);
          diffParts.push(`+++ b/${filePath}`);
          try {
            const [oldContent, newContent] = await Promise.all([
              this.repository.show(commitHash + "^", change.uri.fsPath),
              this.repository.show(commitHash, change.uri.fsPath),
            ]);
            const diff = this.computeSimpleDiff(oldContent, newContent);
            diffParts.push(diff);
          } catch {
            diffParts.push(`@@ ... @@`);
            diffParts.push(`(diff unavailable)`);
          }
          break;

        case Status.INDEX_RENAMED:
          const oldPath = vscode.workspace.asRelativePath(change.originalUri);
          diffParts.push(`rename from ${oldPath}`);
          diffParts.push(`rename to ${filePath}`);
          if (change.renameUri) {
            try {
              const [oldContent, newContent] = await Promise.all([
                this.repository.show(commitHash + "^", change.uri.fsPath),
                this.repository.show(commitHash, change.uri.fsPath),
              ]);
              if (oldContent !== newContent) {
                diffParts.push(`--- a/${oldPath}`);
                diffParts.push(`+++ b/${filePath}`);
                const diff = this.computeSimpleDiff(oldContent, newContent);
                diffParts.push(diff);
              }
            } catch {}
          }
          break;

        default:
          diffParts.push(`${statusSymbol} ${filePath}`);
      }

      diffParts.push("");
    }

    return diffParts.join("\n");
  }

  private computeSimpleDiff(oldContent: string, newContent: string): string {
    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");

    const maxLines = Math.max(oldLines.length, newLines.length);
    const contextLines = 3;
    const chunks: string[] = [];

    let i = 0;
    while (i < maxLines) {
      // Encontrar próxima diferença
      while (i < maxLines && oldLines[i] === newLines[i]) {
        i++;
      }

      if (i >= maxLines) break;

      // Início do chunk (com contexto)
      const chunkStart = Math.max(0, i - contextLines);
      let chunkEnd = i;

      // Encontrar fim do chunk
      while (chunkEnd < maxLines && (oldLines[chunkEnd] !== newLines[chunkEnd] || chunkEnd - i < contextLines * 2)) {
        chunkEnd++;
      }

      chunkEnd = Math.min(maxLines, chunkEnd + contextLines);

      // Gerar header do chunk
      const oldCount = Math.min(chunkEnd, oldLines.length) - chunkStart;
      const newCount = Math.min(chunkEnd, newLines.length) - chunkStart;
      chunks.push(`@@ -${chunkStart + 1},${oldCount} +${chunkStart + 1},${newCount} @@`);

      // Gerar linhas do chunk
      for (let j = chunkStart; j < chunkEnd; j++) {
        if (j >= oldLines.length) {
          chunks.push(`+${newLines[j] || ""}`);
        } else if (j >= newLines.length) {
          chunks.push(`-${oldLines[j] || ""}`);
        } else if (oldLines[j] !== newLines[j]) {
          chunks.push(`-${oldLines[j]}`);
          chunks.push(`+${newLines[j]}`);
        } else {
          chunks.push(` ${oldLines[j]}`);
        }
      }

      i = chunkEnd;
    }

    return chunks.join("\n");
  }

  private getStatusSymbol(status: Status): string {
    switch (status) {
      case Status.MODIFIED:
      case Status.INDEX_MODIFIED:
        return "M";
      case Status.ADDED_BY_THEM:
      case Status.INDEX_ADDED:
        return "A";
      case Status.DELETED:
      case Status.INDEX_DELETED:
        return "D";
      case Status.INTENT_TO_RENAME:
      case Status.INDEX_RENAMED:
        return "R";
      case Status.INDEX_COPIED:
        return "C";
      default:
        return "?";
    }
  }

  async onSelect(commitHash: string) {
    if (!this.repository) return;

    try {
      await execCmd("git-graph.view", {
        repo: this.repository.rootUri.fsPath,
        commitHash: commitHash,
      });
    } catch {
      await vscode.env.clipboard.writeText(commitHash);
      vscode.window.showInformationMessage(`Commit hash copied to clipboard: ${commitHash.substring(0, 7)}`);
    }
  }

  private getFirstLine(message: string): string {
    return message.split("\n")[0].trim();
  }
}
