import { escapeHtml } from "ui/utils/html";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";
import { PreviewManager } from "./preview-manager";

export class OptionListManager<TOption = any> {
  private allOptions: TOption[] = [];
  private filteredOptions: TOption[] = [];
  private selectedIndex: number = 0;

  private currentAdapter: IFuzzyFinderDataAdapter<any, TOption> | null = null;

  private listElement: HTMLUListElement;
  private searchElement: HTMLInputElement;
  private fileCountElement: HTMLElement | null;
  private previewManager: PreviewManager;

  /**
   * Callback invoked when the user confirms a selection
   */
  onSelectionConfirmed?: () => void;

  constructor(previewManager: PreviewManager) {
    this.previewManager = previewManager;
    this.listElement = document.getElementById("option-list") as HTMLUListElement;
    this.searchElement = document.getElementById("search") as HTMLInputElement;
    this.fileCountElement = document.getElementById("file-count");
  }

  setAdapter(adapter: IFuzzyFinderDataAdapter<any, TOption>): void {
    this.currentAdapter = adapter;
  }

  setOptions(options: TOption[]): void {
    if (!this.currentAdapter) {
      console.error("[OptionListManager] No adapter set");
      return;
    }

    this.allOptions = options;
    this.filteredOptions = options;
    this.selectedIndex = 0;

    this.updateFileCount();
    this.render();

    const lastElement = this.filteredOptions.at(0);
    if (lastElement) {
      this.requestPreview(lastElement);
    }
  }

  filter(query: string): void {
    if (!this.currentAdapter) return;

    const lowerQuery = query.toLowerCase();

    if (this.currentAdapter.filterOption) {
      this.filteredOptions = this.allOptions.filter((option) => this.currentAdapter!.filterOption!(option, lowerQuery));
    } else {
      // Default filter (by text)
      this.filteredOptions = this.allOptions.filter((option) => {
        const displayText = this.currentAdapter!.getDisplayText(option);
        return displayText.toLowerCase().includes(lowerQuery);
      });
    }

    this.selectedIndex = 0;
    this.updateFileCount();
    this.render();

    const lastElement = this.filteredOptions.at(0);
    if (lastElement) {
      this.requestPreview(lastElement);
    }

    if (!lastElement) {
      this.previewManager.clearPreview();
      this.previewManager.renderNoPreviewData();
    }
  }

  moveSelection(direction: number): void {
    if (!this.filteredOptions.length) return;

    this.selectedIndex = (this.selectedIndex + direction + this.filteredOptions.length) % this.filteredOptions.length;

    this.render();

    const option = this.filteredOptions[this.selectedIndex];
    this.requestPreview(option);
  }

  /**
   * @returns The adapter-defined selection value
   */
  getSelectedValue(): string | undefined {
    if (!this.currentAdapter) return undefined;

    const option = this.filteredOptions[this.selectedIndex];
    if (!option) return undefined;

    return this.currentAdapter.getSelectionValue(option);
  }

  private render(): void {
    if (!this.currentAdapter) return;

    this.listElement.innerHTML = "";
    const query = this.searchElement.value.toLowerCase();

    const fragment = document.createDocumentFragment();

    this.filteredOptions.forEach((option, idx) => {
      const li = document.createElement("li");
      li.className = "option-item";

      if (idx === this.selectedIndex) {
        li.classList.add("selected");
      }

      const displayText = this.currentAdapter!.getDisplayText(option);
      li.innerHTML = this.highlightMatch(displayText, query);

      li.onclick = () => {
        this.selectedIndex = idx;
        this.render();
        this.onSelectionConfirmed?.();
      };

      fragment.appendChild(li);
    });

    this.listElement.appendChild(fragment);
    this.scrollToSelected();
  }

  public scrollToSelected(): void {
    const selectedElement = this.listElement.querySelector(".option-item.selected");
    console.log("Selected element: ", selectedElement);
    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
    }
  }

  /**
   * Highlights the matched substring inside option text.
   */
  private highlightMatch(text: string, query: string): string {
    if (!query) return escapeHtml(text);

    const i = text.toLowerCase().indexOf(query);
    if (i === -1) return escapeHtml(text);

    const before = escapeHtml(text.slice(0, i));
    const match = escapeHtml(text.slice(i, i + query.length));
    const after = escapeHtml(text.slice(i + query.length));

    return `${before}<span class="highlight">${match}</span>${after}`;
  }

  private requestPreview(option: TOption): void {
    if (!this.currentAdapter) return;

    const selection = this.currentAdapter.getSelectionValue(option);
    this.previewManager.requestPreview(selection);
  }

  private updateFileCount(): void {
    if (this.fileCountElement) {
      this.fileCountElement.textContent = `${this.filteredOptions.length} / ${this.allOptions.length}`;
    }
  }
}
