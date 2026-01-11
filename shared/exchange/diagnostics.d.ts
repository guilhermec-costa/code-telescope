import type { Diagnostic, DiagnosticSeverity, Uri } from "vscode";

export interface DiagnosticData {
  uri: Uri;
  diagnostic: Diagnostic;
  relativePath: string;
  line: number;
  column: number;
  severity: DiagnosticSeverity;
  message: string;
  source?: string;
  code?: string | number;
}

export interface DiagnosticsFinderData {
  diagnostics: DiagnosticData[];
  displayTexts: string[];
  iconsClasses: string[];
}

export interface DiagnosticOption {
  index: number;
  diagnostic: DiagnosticData;
  displayText: string;
  codicon: string;
}
