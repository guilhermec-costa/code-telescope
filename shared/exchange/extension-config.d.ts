export interface WsFileFinderConfig {
  excludeHidden: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  maxResults: number;
  asRelativePath: boolean;
}

export interface WsTextFinderConfig {
  excludeHidden: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  maxResults: number;
  maxFileSize: string;
  maxColumns: number;
}

export interface PanelSetupConfig {
  rightSideWidthPct: number;
  leftSideWidthPct: number;
  panelContainerPct: number;
}
