import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { ReferenceFinderData, ReferenceInfo } from "../../../../shared/exchange/lsp-refs";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface ReferenceOption {
  index: number;
  ref: ReferenceInfo;
  displayText: string;
}

@FuzzyFinderDataAdapter({
  type: "workspaceReferencesAdapter",
})
export class ReferencesFinderDataAdapter implements IFuzzyFinderDataAdapter<ReferenceFinderData, ReferenceOption> {
  typeName!: DataAdapterType;
  shouldSort = false;

  parseOptions(data: ReferenceFinderData): ReferenceOption[] {
    return data.references.map((ref, i) => ({
      index: i,
      ref,
      displayText: data.displayTexts[i],
    }));
  }

  getSearchText(option: ReferenceOption): string {
    return `${option.ref.relativePath} ${option.ref.preview.trim()}`;
  }

  getHtmlWrapper(option: ReferenceOption, highlightedContent: string): string {
    const lineTag = `<span class="sk-line-number">:${option.ref.line}</span>`;
    return `
      <i class="codicon codicon-references file-icon"></i>
      <span class="file-path">${highlightedContent}</span>
      ${lineTag}
    `;
  }

  getSelectionValue(option: ReferenceOption): string {
    return option.index.toString();
  }
}
