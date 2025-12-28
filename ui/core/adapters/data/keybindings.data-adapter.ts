import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

interface KeybindingData {
  key: string;
  command: string;
  when?: string;
  args?: any;
}

interface KeybindingFinderData {
  keybindings: KeybindingData[];
  displayTexts: string[];
}

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
    return option.displayText;
  }

  getSelectionValue(option: KeybindingOption): string {
    // Retorna o índice como string para ser usado na busca e seleção
    return option.index.toString();
  }

  filterOption(option: KeybindingOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const kb = option.keybinding;

    // Busca em múltiplos campos
    return (
      kb.key.toLowerCase().includes(lowerQuery) ||
      kb.command.toLowerCase().includes(lowerQuery) ||
      (kb.when?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }
}
