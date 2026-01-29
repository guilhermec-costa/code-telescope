import type { Uri } from "vscode";

export interface BreakpointData {
  id: string;
  uri: Uri;
  line: number;
  column?: number;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
  enabled: boolean;
}

export interface BreakpointsFinderData {
  breakpoints: BreakpointData[];
  displayTexts: string[];
}
