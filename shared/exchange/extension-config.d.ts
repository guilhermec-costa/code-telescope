export interface FinderConfig {
  excludeHidden: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  maxResults: number;
  asRelativePath: boolean;
}

export interface PanelSetupConfig {
  rightSideWidthPct: number;
  leftSideWidthPct: number;
}
