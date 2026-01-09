export interface RecentFileData {
  path: string;
  relativePath: string;
  lastModified: Date;
  exists: boolean;
}

export interface RecentFilesFinderData {
  files: RecentFileData[];
  displayTexts: string[];
  svgIconUrls: string[];
}
