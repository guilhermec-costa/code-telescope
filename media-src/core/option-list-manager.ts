import { escapeHtml } from "media-src/utils/html";
import { PreviewManager } from "./preview-manager";

export class OptionListManager {
  private allOptions: string[] = [];
  private filteredOptions: string[] = [];
  private selectedIndex: number = 0;

  private listElement: HTMLUListElement;
  private searchElement: HTMLInputElement;
  private fileCountElement: HTMLElement | null;
  private previewManager: PreviewManager;

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

  setOptions(options: string[]): void {
    this.allOptions = options;
    this.filteredOptions = options;
    this.selectedIndex = this.filteredOptions.length - 1;

    this.updateFileCount();
    this.render();

    const lastElement = this.filteredOptions.at(-1);
    if (lastElement) {
      this.previewManager.requestPreviewIfNeeded(lastElement);
    }
  }

  filter(query: string): void {
    const lowerQuery = query.toLowerCase();

    this.filteredOptions = this.allOptions.filter((option) => option.toLowerCase().includes(lowerQuery));
    this.selectedIndex = this.filteredOptions.length - 1;

    this.updateFileCount();
    this.render();

    const lastElement = this.filteredOptions.at(-1);
    if (lastElement) {
      this.previewManager.requestPreviewIfNeeded(lastElement);
    }
  }

  moveSelection(direction: number): void {
    if (!this.filteredOptions.length) return;

    this.selectedIndex = (this.selectedIndex + direction + this.filteredOptions.length) % this.filteredOptions.length;

    this.ensureSelectedVisible();
    this.renderVisible();

    const option = this.filteredOptions[this.selectedIndex];
    this.previewManager.requestPreviewIfNeeded(option);
  }

  getSelectedOption(): string | undefined {
    return this.filteredOptions[this.selectedIndex];
  }

  private render(): void {
    const totalHeight = this.filteredOptions.length * this.ITEM_HEIGHT;
    this.listElement.style.height = `${totalHeight}px`;
    this.listElement.style.position = "relative";

    this.listElement.scrollTop = totalHeight;

    this.renderVisible();
  }

  private renderVisible(): void {
    const scrollTop = this.listElement.scrollTop;

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

      li.innerHTML = this.highlightMatch(option, query);

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

    if (selectedTop < scrollTop) {
      this.listElement.scrollTop = selectedTop;
    } else if (selectedBottom > scrollBottom) {
      this.listElement.scrollTop = selectedBottom - this.containerHeight;
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
