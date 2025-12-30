export interface WsFileFinderConfig {
  excludeHidden: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  maxResults: number;
  asRelativePath: boolean;
  textDisplay: "relative" | "absolte" | "filename-only";
}

export interface WsTextFinderConfig {
  excludeHidden: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  maxResults: number;
  maxFileSize: string;
  maxColumns: number;
}

export interface LayoutSetupConfig {
  mode: "classic" | "ivy";
  rightSideWidthPct: number;
  leftSideWidthPct: number;
  panelContainerPct: number;
  ivyHeightPct: number;
  promptFontSize: number;
  resultsFontSize: number;
  previewFontSize: number;
  borderSizeInPx: number;
  borderRadiusInPx: number;
}

export interface PreviewManagerConfig {
  scrollBehavior: "auto" | "instant" | "smooth";
  verticalScrollFraction: "1/2" | "1/3" | "1/4";
  horizontalScrollFraction: "1/2" | "1/3" | "1/4";
  showLineNumbers: boolean;
}

export interface KeybindingConfig {
  moveDown: string;
  moveUp: string;
  confirm: string;
  close: string;
  scrollUp: string;
  scrollDown: string;
  scrollLeft: string;
  scrollRight: string;
}
