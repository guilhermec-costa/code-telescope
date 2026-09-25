export interface DoomFinderItem {
  id: "doom-shareware";
  name: string;
  description: string;
}

export interface DoomFinderData {
  items: DoomFinderItem[];
}

export interface DoomPreviewContent {
  enginePath: string;
  musicEnginePath: string;
  wadPath: string;
}
