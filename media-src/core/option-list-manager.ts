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

  constructor(previewManager: PreviewManager) {
    this.previewManager = previewManager;
    this.listElement = document.getElementById("option-list") as HTMLUListElement;
    this.searchElement = document.getElementById("search") as HTMLInputElement;
    this.fileCountElement = document.getElementById("file-count");
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

    this.render();

    const option = this.filteredOptions[this.selectedIndex];
    this.previewManager.requestPreviewIfNeeded(option);
  }

  getSelectedOption(): string | undefined {
    return this.filteredOptions[this.selectedIndex];
  }

  private render(): void {
    this.listElement.innerHTML = "";

    const query = this.searchElement.value.toLowerCase();

    this.filteredOptions.forEach((option, idx) => {
      const li = document.createElement("li");
      li.className = "option-item";
      if (idx === this.selectedIndex) {
        li.classList.add("selected");
      }

      li.innerHTML = this.highlightMatch(option, query);
      li.onclick = () => {
        this.selectedIndex = idx;
        this.notifySelection();
      };

      this.listElement.appendChild(li);
    });

    this.listElement.scrollTop = this.listElement.scrollHeight;
    this.scrollSelectedIntoView();
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

  private scrollSelectedIntoView(): void {
    const selected = this.listElement.querySelector(".selected");
    selected?.scrollIntoView({ block: "nearest" });
  }

  private updateFileCount(): void {
    if (this.fileCountElement) {
      this.fileCountElement.textContent = `${this.filteredOptions.length} / ${this.allOptions.length}`;
    }
  }

  private notifySelection(): void {
    // Este método será chamado pelo controlador principal
    // através de um callback registrado
  }

  onSelectionConfirmed?: () => void;
}
