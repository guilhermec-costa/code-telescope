export interface KeybindingData {
  key: string;
  command: string;
  when?: string;
  args?: any;
}

export interface KeybindingFinderData {
  keybindings: KeybindingData[];
  displayTexts: string[];
}
