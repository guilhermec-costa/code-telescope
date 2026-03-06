export interface FontData {
  name: string;
  source: "system" | "fallback";
}

export interface FontFinderData {
  fonts: FontData[];
  displayTexts: string[];
}
