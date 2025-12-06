/**
 * Fuzzy Adapters Namespace
 * Each type here connects a provider (extension) with its adapter (webview).
 */
export type FuzzyAdapter =
  // File & Workspace
  | "workspace-file-finder"
  | "workspace-text-search"
  | "recent-files-finder"

  // Git
  | "vscode-branch-finder"
  | "git-commit-search"
  | "git-file-history"

  // Code Navigation
  | "workspace-symbol-finder"
  | "document-symbol-finder"
  | "goto-definition-finder"

  // Tasks & Commands
  | "task-finder"
  | "command-palette-finder"
  | "npm-script-finder"

  // Extensions
  | "extension-finder"
  | "snippet-finder";

export type PreviewAdapter =
  | "workspace-file-finder"
  | "vscode-branch-finder"
  | "git-commit-search"
  | "extension-finder"
  | "code-with-highlight";
