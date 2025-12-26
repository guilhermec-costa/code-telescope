/**
 * Fuzzy Adapters Namespace
 * Each type here connects a provider (extension) with its adapter (webview).
 */
export type BuiltinFuzzyProviderType =
  | "workspace.files"
  | "workspace.text"
  | "workspace.recentFiles"
  | "git.branches"
  | "git.commits"
  | "git.fileHistory"
  | "code.workspaceSymbols"
  | "code.documentSymbols"
  | "code.gotoDefinition"
  | "tasks.all"
  | "commands.all"
  | "npm.scripts"
  | "extensions.all"
  | "snippets.all";

export type CustomFuzzyProviderType = `custom.${string}`;

export type FuzzyProviderType = BuiltinFuzzyProviderType | CustomFuzzyProviderType;

export type PreviewRendererType = "preview.codeHighlighted" | "preview.branch" | "preview.commitDiff";
