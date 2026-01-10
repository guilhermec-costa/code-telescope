import type { CallHierarchyItem, Range, SymbolKind, Uri } from "vscode";

export interface CallHierarchyData {
  type: "incoming" | "outgoing";
  item: CallHierarchyItem;
  fromRanges?: Range[];
  uri: Uri;
  name: string;
  detail: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  containerName?: string;
  relativePath: string;
  line: number;
}

export interface CallHierarchyFinderData {
  calls: CallHierarchyData[];
  displayTexts: string[];
  codicons: string[];
  currentSymbol?: string;
}
