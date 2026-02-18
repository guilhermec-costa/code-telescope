/**
 * Fuzzy Adapters Namespace
 * Each type here connects a provider (extension) with its adapter (webview).
 */
export type BuiltinFuzzyProviderType =
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
  | "debug.breakpoints";

export type CustomFuzzyProviderType = `custom.${string}`;

export type FuzzyProviderType = BuiltinFuzzyProviderType | CustomFuzzyProviderType;

export type DataAdapterType =
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
  | `custom${string}Adapter`;

export type PreviewRendererType =
  | "preview.buffer"
  | "preview.branch"
  | "preview.commitDiff"
  | "preview.image"
  | "preview.failed";
