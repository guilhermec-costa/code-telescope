export interface RecentFileData {
  kind: "file" | "terminal";
  path: string;
  relativePath: string;
  lastModified: Date;
  exists: boolean;
}

export interface RecentFilesFinderData {
  files: RecentFileData[];
  displayTexts: string[];
}
