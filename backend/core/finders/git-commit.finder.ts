import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { API, GitExtension, Repository } from "../../@types/git";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

@FuzzyFinderAdapter({
  fuzzy: "git.commits",
  previewRenderer: "preview.codeHighlighted",
})
export class GitCommitFuzzyFinderProvider implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  private readonly gitApi: API | null;
  private repository: Repository | null = null;

  constructor(private readonly maxCommits: number = 100) {
    this.gitApi = this.getGitApi();
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
      const diff = await this.repository.diffWith(commitHash);
      const commits = await this.repository.log({ maxEntries: this.maxCommits });
      const commit = commits.find((c) => c.hash === commitHash);

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

  async onSelect(commitHash: string) {
    if (!this.repository) return;

    try {
      await vscode.commands.executeCommand("git-graph.view", {
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

  private getGitApi(): API | null {
    const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git");
    if (!gitExtension) return null;

    const git = gitExtension.exports;
    return git.getAPI(1);
  }
}
