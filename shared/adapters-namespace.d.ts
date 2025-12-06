/**
 * Represents a provider in the backend that supplies
 * fuzzy-searchable data to the webview.
 */
export type FuzzyProviderType =
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

export type PreviewRendererType =
  | "workspace-file-finder"
  | "vscode-branch-finder"
  | "git-commit-search"
  | "extension-finder"
  | "code-with-highlight";
