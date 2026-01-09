export interface ColorThemeData {
  id: string;
  label: string;
  uiTheme: string;
  extensionId?: string;
  isCurrent: boolean;
}

export interface ColorSchemesFinderData {
  themes: ColorThemeData[];
  displayTexts: string[];
}
