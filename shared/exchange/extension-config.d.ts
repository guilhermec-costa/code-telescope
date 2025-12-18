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

export interface PreviewManagerConfig {
  scrollBehavior: "auto" | "instant" | "smooth";
  verticalScrollFraction: "1/2" | "1/3" | "1/4";
  horizontalScrollFraction: "1/2" | "1/3" | "1/4";
}
