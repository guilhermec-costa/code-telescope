/**
 * Fuzzy Adapters Namespace
 * Each type here connects a provider (extension) with its adapter (webview).
 */
export type FuzzyProviderType =
  // File & Workspace
  | "workspace.files"
  | "workspace.text"
  | "workspace.recentFiles"

  // Git
  | "git.branches"
  | "git.commits"
  | "git.fileHistory"

  // Code Navigation
  | "code.workspaceSymbols"
  | "code.documentSymbols"
  | "code.gotoDefinition"

  // Tasks & Commands
  | "tasks.all"
  | "commands.all"
  | "npm.scripts"

  // Extensions
  | "extensions.all"
  | "snippets.all";

export type PreviewRendererType = "preview.codeHighlighted";
