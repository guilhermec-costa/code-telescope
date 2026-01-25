import type { Position, Uri } from "vscode";

export interface HarpoonMark {
  uri: Uri;
  label?: string;
  position?: Position;
}

export interface HarpoonData {
  marks: HarpoonMark[];
  version: number;
}

export interface HarpoonFinderData {
  marks: HarpoonMark[];
  displayTexts: string[];
  svgIconUrls: string[];
}
