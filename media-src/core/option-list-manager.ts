import { escapeHtml } from "media-src/utils/html";
import { IFinderAdapter } from "../finder-adapter";
import { PreviewManager } from "./preview-manager";

export class OptionListManager<TOption = any> {
  private allOptions: TOption[] = [];
  private filteredOptions: TOption[] = [];
  private selectedIndex: number = 0;
  private currentAdapter: IFinderAdapter<any, TOption> | null = null;

  private listElement: HTMLUListElement;
  private searchElement: HTMLInputElement;
  private fileCountElement: HTMLElement | null;
  private previewManager: PreviewManager;

  // virtualization
  private readonly ITEM_HEIGHT = 22;
  private readonly BUFFER_SIZE = 5;
  private visibleStartIndex = 0;
  private visibleEndIndex = 0;
  private containerHeight = 0;

  constructor(previewManager: PreviewManager) {
    this.previewManager = previewManager;
    this.listElement = document.getElementById("option-list") as HTMLUListElement;
    this.searchElement = document.getElementById("search") as HTMLInputElement;
    this.fileCountElement = document.getElementById("file-count");

    this.setupVirtualization();
  }

  /**
   * Define o adapter a ser usado e as opções
   */
  setAdapter(adapter: IFinderAdapter<any, TOption>): void {
    this.currentAdapter = adapter;
  }

  /**
   * Define as opções usando o adapter atual
   */
  setOptions(options: TOption[]): void {
    if (!this.currentAdapter) {
      console.error("No adapter set for GenericOptionListManager");
      return;
    }

    this.allOptions = options;
    this.filteredOptions = options;
    this.selectedIndex = this.filteredOptions.length - 1;

    this.updateFileCount();
    this.render();

    const lastElement = this.filteredOptions.at(-1);
    if (lastElement) {
      this.requestPreview(lastElement);
    }
  }

  filter(query: string): void {
    if (!this.currentAdapter) return;

    const lowerQuery = query.toLowerCase();

    if (this.currentAdapter.filterOption) {
      this.filteredOptions = this.allOptions
        .filter((option) => this.currentAdapter!.filterOption!(option, lowerQuery))
        .sort();
    } else {
      // default filter (by text)
      this.filteredOptions = this.allOptions
        .filter((option) => {
          const displayText = this.currentAdapter!.getDisplayText(option);
          return displayText.toLowerCase().includes(lowerQuery);
        })
        .sort();
    }

    this.selectedIndex = this.filteredOptions.length - 1;

    this.updateFileCount();
    this.render();

    const lastElement = this.filteredOptions.at(-1);
    if (lastElement) {
      this.requestPreview(lastElement);
    }
  }

  moveSelection(direction: number): void {
    if (!this.filteredOptions.length) return;

    this.selectedIndex = (this.selectedIndex + direction + this.filteredOptions.length) % this.filteredOptions.length;

    this.ensureSelectedVisible();
    this.renderVisible();

    const option = this.filteredOptions[this.selectedIndex];
    this.requestPreview(option);
  }

  getSelectedOption(): TOption | undefined {
    return this.filteredOptions[this.selectedIndex];
  }

  /**
   * Retorna o valor de seleção formatado pelo adapter
   */
  getSelectedValue(): string | undefined {
    if (!this.currentAdapter) return undefined;

    const option = this.getSelectedOption();
    if (!option) return undefined;

    return this.currentAdapter.getSelectionValue(option);
  }

  private setupVirtualization(): void {
    this.updateContainerHeight();

    this.listElement.addEventListener("scroll", () => {
      this.renderVisible();
    });

    window.addEventListener("resize", () => {
      this.updateContainerHeight();
      this.renderVisible();
    });
  }

  private updateContainerHeight(): void {
    this.containerHeight = this.listElement.clientHeight;
  }

  private render(): void {
    const totalHeight = this.filteredOptions.length * this.ITEM_HEIGHT;
    this.listElement.style.height = `${totalHeight}px`;
    this.listElement.style.position = "relative";

    this.listElement.scrollTop = totalHeight;

    this.renderVisible();
  }

  private renderVisible(): void {
    if (!this.currentAdapter) return;

    const scrollTop = this.listElement.scrollTop;
    this.containerHeight = this.listElement.clientHeight;

    this.visibleStartIndex = Math.max(0, Math.floor(scrollTop / this.ITEM_HEIGHT) - this.BUFFER_SIZE);
    this.visibleEndIndex = Math.min(
      this.filteredOptions.length,
      Math.ceil((scrollTop + this.containerHeight) / this.ITEM_HEIGHT) + this.BUFFER_SIZE,
    );

    this.listElement.innerHTML = "";
    const query = this.searchElement.value.toLowerCase();

    const fragment = document.createDocumentFragment();

    for (let idx = this.visibleStartIndex; idx < this.visibleEndIndex; idx++) {
      const option = this.filteredOptions[idx];
      const li = document.createElement("li");
      li.className = "option-item";

      li.style.position = "absolute";
      li.style.top = `${idx * this.ITEM_HEIGHT}px`;
      li.style.height = `${this.ITEM_HEIGHT}px`;
      li.style.width = "100%";
      li.style.boxSizing = "border-box";

      if (idx === this.selectedIndex) {
        li.classList.add("selected");
      }

      const displayText = this.currentAdapter.getDisplayText(option);
      li.innerHTML = this.highlightMatch(displayText, query);

      ((index) => {
        li.onclick = () => {
          this.selectedIndex = index;
          this.renderVisible();
          this.notifySelection();
        };
      })(idx);

      fragment.appendChild(li);
    }

    this.listElement.appendChild(fragment);
  }

  private ensureSelectedVisible(): void {
    const selectedTop = this.selectedIndex * this.ITEM_HEIGHT;
    const selectedBottom = selectedTop + this.ITEM_HEIGHT;
    const scrollTop = this.listElement.scrollTop;
    const scrollBottom = scrollTop + this.containerHeight;

    const margin = this.ITEM_HEIGHT;

    if (selectedTop < scrollTop + margin) {
      this.listElement.scrollTop = Math.max(0, selectedTop - margin);
    } else if (selectedBottom > scrollBottom - margin) {
      this.listElement.scrollTop = selectedBottom - this.containerHeight + margin;
    }
  }

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

    if (this.currentAdapter.getPreviewData) {
      const previewData = this.currentAdapter.getPreviewData(option);
      this.previewManager.requestPreviewIfNeeded(previewData);
    } else {
      const displayText = this.currentAdapter.getDisplayText(option);
      this.previewManager.requestPreviewIfNeeded(displayText);
    }
  }

  private updateFileCount(): void {
    if (this.fileCountElement) {
      this.fileCountElement.textContent = `${this.filteredOptions.length} / ${this.allOptions.length}`;
    }
  }

  private notifySelection(): void {
    this.onSelectionConfirmed?.();
  }

  onSelectionConfirmed?: () => void;
}
