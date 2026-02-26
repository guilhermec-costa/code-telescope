import * as vscode from "vscode";
import type { FuzzyProviderType } from "../../shared/adapters-namespace";
import { Globals } from "../globals";

export function getConfigurationSection<T>(section: string, defaultValue: T): T {
  return vscode.workspace.getConfiguration().get<T>(section, defaultValue);
}

type ProviderMeta = {
  tabTitle: string;
  listTitle: string;
  previewTitle: string;
  promptMessage: string;
};

const BUILTIN_PROVIDER_META: Record<FuzzyProviderType, ProviderMeta> = {
  "workspace.files": {
    tabTitle: "Workspace Files",
    listTitle: "Files",
    previewTitle: "File Preview",
    promptMessage: "Find files...",
  },
  "workspace.text": {
    tabTitle: "Search in Workspace",
    listTitle: "Matches",
    previewTitle: "Match Preview",
    promptMessage: "Grep workspace...",
  },
  "currentFile.text": {
    tabTitle: "Search in Current File",
    listTitle: "Matches",
    previewTitle: "Match Preview",
    promptMessage: "Grep file...",
  },
  "workspace.recentFiles": {
    tabTitle: "Recent Files",
    listTitle: "Recent Files",
    previewTitle: "File Preview",
    promptMessage: "Recent files...",
  },
  "workspace.keybindings": {
    tabTitle: "Keybindings",
    listTitle: "Available Keybindings",
    previewTitle: "Keybinding Details",
    promptMessage: "Keybindings...",
  },
  "workspace.tasks": {
    tabTitle: "Tasks",
    listTitle: "Available Tasks",
    previewTitle: "Task Details",
    promptMessage: "Tasks...",
  },
  "workspace.colorschemes": {
    tabTitle: "Color Schemes",
    listTitle: "Themes",
    previewTitle: "Theme Preview",
    promptMessage: "Themes...",
  },
  "workspace.callHierarchy": {
    tabTitle: "Call Hierarchy",
    listTitle: "Calls",
    previewTitle: "Call Details",
    promptMessage: "Calls...",
  },
  "workspace.diagnostics": {
    tabTitle: "Diagnostics",
    listTitle: "Problems",
    previewTitle: "Diagnostic Details",
    promptMessage: "Diagnostics...",
  },
  "harpoon.marks": {
    tabTitle: "Harpoon Marks",
    listTitle: "Marks",
    previewTitle: "Mark Preview",
    promptMessage: "Marks...",
  },
  "git.branches": {
    tabTitle: "Git Branches",
    listTitle: "Branches",
    previewTitle: "Branch Details",
    promptMessage: "Branches...",
  },
  "git.commits": {
    tabTitle: "Git Commits",
    listTitle: "Commits",
    previewTitle: "Commit Diff",
    promptMessage: "Commits...",
  },
  "workspace.symbols": {
    tabTitle: "Workspace Symbols",
    listTitle: "Symbols",
    previewTitle: "Symbol Details",
    promptMessage: "Workspace symbols...",
  },
  "debug.breakpoints": {
    tabTitle: "Breakpoints",
    listTitle: "Breakpoints",
    previewTitle: "Breakpoint Details",
    promptMessage: "Breakpoints...",
  },
  "document.symbols": {
    tabTitle: "Document Symbols",
    listTitle: "Symbols in File",
    previewTitle: "Symbol Preview",
    promptMessage: "Document symbols...",
  },
  "workspace.extensions": {
    tabTitle: "Workspace Extensions",
    listTitle: "Installed Extensions",
    previewTitle: "Extension Details",
    promptMessage: "Extensions...",
  },
};

export function getProviderTabTitle(provider: FuzzyProviderType): string {
  if (provider.startsWith(Globals.CUSTOM_PROVIDER_PREFIX)) {
    const name = provider.replace(Globals.CUSTOM_PROVIDER_PREFIX, "");
    return `Custom · ${capitalize(name)}`;
  }

  return BUILTIN_PROVIDER_META[provider].tabTitle;
}

export function getProviderListTitle(provider: FuzzyProviderType): string {
  if (provider.startsWith(Globals.CUSTOM_PROVIDER_PREFIX)) {
    const name = provider.replace(Globals.CUSTOM_PROVIDER_PREFIX, "");
    return `${capitalize(name)} Options`;
  }

  return BUILTIN_PROVIDER_META[provider].listTitle;
}

export function getProviderPreviewTitle(provider: FuzzyProviderType): string {
  if (provider.startsWith(Globals.CUSTOM_PROVIDER_PREFIX)) {
    const name = provider.replace(Globals.CUSTOM_PROVIDER_PREFIX, "");
    return `${capitalize(name)} Preview`;
  }

  return BUILTIN_PROVIDER_META[provider].previewTitle;
}

export function getProviderPromptMessage(provider: FuzzyProviderType): string {
  if (provider.startsWith(Globals.CUSTOM_PROVIDER_PREFIX)) {
    const name = provider.replace(Globals.CUSTOM_PROVIDER_PREFIX, "");
    return `${capitalize(name)}...`;
  }

  return BUILTIN_PROVIDER_META[provider].promptMessage;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
