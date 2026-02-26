export interface ExtensionData {
  id: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  isActive: boolean;
  extensionPath: string;
  packageJSON: Record<string, unknown>;
}

export interface ExtensionFinderData {
  extensions: ExtensionData[];
  displayTexts: string[];
}
