/**
 * Fuzzy Adapters Namespace
 * Each type here connects a provider (extension) with its adapter (webview).
 */
export type BuiltinFuzzyProviderType =
  | "workspace.files"
  | "workspace.text"
  | "workspace.recentFiles"
  | "workspace.keybindings"
  | "workspace.tasks"
  | "workspace.colorschemes"
  | "workspace.callHierarchy"
  | "workspace.diagnostics"
  | "harpoon.marks"
  | "git.branches"
  | "workspace.symbols"
  | "code.documentSymbols";

export type CustomFuzzyProviderType = `custom.${string}`;

export type FuzzyProviderType = BuiltinFuzzyProviderType | CustomFuzzyProviderType;

export type PreviewRendererType = "preview.codeHighlighted" | "preview.branch" | "preview.image" | "preview.failed";
