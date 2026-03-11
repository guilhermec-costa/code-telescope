import type { Range, Uri } from "vscode";

export interface ReferenceInfo {
  index: number;
  uri: Uri;
  range: Range;
  relativePath: string;
  line: number;
  preview: string;
  symbolName: string;
}

export interface ReferenceFinderData {
  references: ReferenceInfo[];
  displayTexts: string[];
  currentSymbol: string | undefined;
}
