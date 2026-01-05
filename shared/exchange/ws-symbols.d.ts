export interface WorkspaceSymbolData {
  name: string;
  containerName: string;
  codicon: string;
}

export interface WorkspaceSymbolFinderData {
  symbols: WorkspaceSymbolData[];
  displayTexts: string[];
}
