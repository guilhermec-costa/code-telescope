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
};

const BUILTIN_PROVIDER_META: Record<FuzzyProviderType, ProviderMeta> = {
  "workspace.files": {
    tabTitle: "Workspace Files",
    listTitle: "Files",
    previewTitle: "File Preview",
  },
  "workspace.text": {
    tabTitle: "Search in Workspace",
    listTitle: "Matches",
    previewTitle: "Match Preview",
  },
  "currentFile.text": {
    tabTitle: "Search in Current File",
    listTitle: "Matches",
    previewTitle: "Match Preview",
  },
  "workspace.recentFiles": {
    tabTitle: "Recent Files",
    listTitle: "Recent Files",
    previewTitle: "File Preview",
  },
  "workspace.keybindings": {
    tabTitle: "Keybindings",
    listTitle: "Available Keybindings",
    previewTitle: "Keybinding Details",
  },
  "workspace.tasks": {
    tabTitle: "Tasks",
    listTitle: "Available Tasks",
    previewTitle: "Task Details",
  },
  "workspace.colorschemes": {
    tabTitle: "Color Schemes",
    listTitle: "Themes",
    previewTitle: "Theme Preview",
  },
  "workspace.callHierarchy": {
    tabTitle: "Call Hierarchy",
    listTitle: "Calls",
    previewTitle: "Call Details",
  },
  "workspace.diagnostics": {
    tabTitle: "Diagnostics",
    listTitle: "Problems",
    previewTitle: "Diagnostic Details",
  },
  "harpoon.marks": {
    tabTitle: "Harpoon Marks",
    listTitle: "Marks",
    previewTitle: "Mark Preview",
  },
  "git.branches": {
    tabTitle: "Git Branches",
    listTitle: "Branches",
    previewTitle: "Branch Details",
  },
  "git.commits": {
    tabTitle: "Git Commits",
    listTitle: "Commits",
    previewTitle: "Commit Diff",
  },
  "workspace.symbols": {
    tabTitle: "Workspace Symbols",
    listTitle: "Symbols",
    previewTitle: "Symbol Details",
  },
  "debug.breakpoints": {
    tabTitle: "Breakpoints",
    listTitle: "Breakpoints",
    previewTitle: "Breakpoint Details",
  },
  "document.symbols": {
    tabTitle: "Document Symbols",
    listTitle: "Symbols in File",
    previewTitle: "Symbol Preview",
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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
