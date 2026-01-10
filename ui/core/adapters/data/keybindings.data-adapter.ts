import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { KeybindingData, KeybindingFinderData } from "../../../../shared/exchange/keybindings";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface KeybindingOption {
  index: number;
  keybinding: KeybindingData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.keybindings",
  preview: "preview.codeHighlighted",
})
export class KeybindingsFinderDataAdapter implements IFuzzyFinderDataAdapter<KeybindingFinderData, KeybindingOption> {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

  parseOptions(data: KeybindingFinderData): KeybindingOption[] {
    const options: KeybindingOption[] = [];

    for (let i = 0; i < data.keybindings.length; i++) {
      options.push({
        index: i,
        keybinding: data.keybindings[i],
        displayText: data.displayTexts[i],
      });
    }

    return options;
  }

  getDisplayText(option: KeybindingOption): string {
    return `<i class="codicon codicon-record-keys file-icon sk-record-keys"></i><span class="file-path">${option.displayText}</span>`;
  }

  getSelectionValue(option: KeybindingOption): string {
    return option.index.toString();
  }

  filterOption(option: KeybindingOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const kb = option.keybinding;

    return (
      kb.key.toLowerCase().includes(lowerQuery) ||
      kb.command.toLowerCase().includes(lowerQuery) ||
      (kb.when?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }
}
