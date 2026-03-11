/**
 * Fuzzy Adapters Namespace
 * Each type here connects a provider (extension) with its adapter (webview).
 */
export type BuiltinFuzzyProviderType =
  | "builtin.finders"
  | "workspace.files"
  | "workspace.text"
  | "currentFile.text"
  | "workspace.recentFiles"
  | "workspace.keybindings"
  | "workspace.tasks"
  | "workspace.colorschemes"
  | "workspace.callHierarchy"
  | "workspace.diagnostics"
  | "harpoon.marks"
  | "git.branches"
  | "git.commits"
  | "workspace.symbols"
  | "document.symbols"
  | "debug.breakpoints"
  | "workspace.fonts"
  | "workspace.packageDocs"
  | "workspace.references"
  | "workspace.extensions";

export type CustomFuzzyProviderType = `custom.${string}` | `ext.${string}`;

export type FuzzyProviderType = BuiltinFuzzyProviderType | CustomFuzzyProviderType;

export type DataAdapterType =
  | "builtinFindersAdapter"
  | "workspaceFilesAdapter"
  | "textSearchAdapter"
  | "workspaceRecentFilesAdapter"
  | "workspaceKeybindingsAdapter"
  | "workspaceTasksAdapter"
  | "workspaceColorschemesAdapter"
  | "workspaceCallHierarchyAdapter"
  | "workspaceDiagnosticsAdapter"
  | "harpoonMarksAdapter"
  | "gitBranchesAdapter"
  | "gitCommitsAdapter"
  | "symbolsAdapter"
  | "debugBreakpointsAdapter"
  | "fontsAdapter"
  | "extensionsAdapter"
  | "packageDocsAdapter"
  | "workspaceReferencesAdapter"
  | `custom.${string}`
  | `ext.${string}`;

export type PreviewRendererType =
  | "preview.buffer"
  | "preview.branch"
  | "preview.image"
  | "preview.font"
  | "preview.failed"
  | "preview.none";
