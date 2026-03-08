import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { KeybindingData, KeybindingFinderData } from "../../../../shared/exchange/keybindings";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface KeybindingOption {
  index: number;
  keybinding: KeybindingData;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "workspaceKeybindingsAdapter",
})
export class KeybindingsFinderDataAdapter implements IFuzzyFinderDataAdapter<KeybindingFinderData, KeybindingOption> {
  typeName: DataAdapterType;

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

  getSearchText(option: KeybindingOption): string {
    const kb = option.keybinding;
    return `${kb.key} ${kb.command} ${kb.when || ""}`;
  }

  getHtmlWrapper(option: KeybindingOption, highlightedContent: string): string {
    return `<i class="codicon codicon-record-keys file-icon sk-record-keys"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: KeybindingOption): string {
    return option.index.toString();
  }
}
