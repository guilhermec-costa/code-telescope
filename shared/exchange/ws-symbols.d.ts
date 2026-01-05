export interface WorkspaceSymbolData {
  name: string;
  containerName: string;
  kindName: string;
  codicon: string;
}

export interface WorkspaceSymbolFinderData {
  symbols: WorkspaceSymbolData[];
  displayTexts: string[];
}
