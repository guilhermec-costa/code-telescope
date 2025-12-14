import { escapeHtml } from "ui/utils/html";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";
import { PreviewManager } from "../render/preview-manager";
import { Virtualizer } from "../render/virtualizer";

export class OptionListManager {
  private allOptions: any[] = [];
  private filteredOptions: any[] = [];
  private selectedIndex: number = 0;
  private currentAdapter: IFuzzyFinderDataAdapter<any, any> | null = null;

  private listElement: HTMLUListElement;
  private itemsCountElement: HTMLElement | null;

  private query: string = "";

  private readonly RENDER_THRESHOLD = 200;

  private virtualizer: Virtualizer;

  public onSelectionConfirmed?: () => void;

  constructor(private readonly previewManager: PreviewManager) {
    this.listElement = document.getElementById("option-list") as HTMLUListElement;
    this.itemsCountElement = document.getElementById("items-count");

    this.virtualizer = new Virtualizer(this.listElement, {
      itemHeight: 22,
      bufferSize: 10,
    });

    this.setupScrollListener();
  }

  private setupScrollListener(): void {
    this.listElement.addEventListener("scroll", () => {
      if (this.shouldUseVirtualization()) {
        this.virtualizer.renderVirtualized(this.filteredOptions, this.selectedIndex, this.query, (item, idx, q) =>
          this.createListItem(item, idx, q),
        );
      }
    });
  }

  public setAdapter(adapter: IFuzzyFinderDataAdapter<any, any>): void {
    this.currentAdapter = adapter;
  }

  public setOptions(options: any[]): void {
    if (!this.currentAdapter) {
      console.error("[OptionListManager] No adapter set");
      return;
    }

    this.allOptions = options;
    this.filteredOptions = options;
    this.selectedIndex = 0;
    this.query = "";
    this.updateItemsCount();
    this.render();

    const first = this.filteredOptions[0];
    if (first) this.requestPreview(first);
  }

  public filter(query: string): void {
    if (!this.currentAdapter) return;

    this.query = query.toLowerCase();

    if (this.currentAdapter.filterOption) {
      this.filteredOptions = this.allOptions.filter((opt) => this.currentAdapter!.filterOption!(opt, this.query));
    } else {
      this.filteredOptions = this.allOptions.filter((opt) => {
        const text = this.currentAdapter!.getDisplayText(opt);
        return text.toLowerCase().includes(this.query);
      });
    }

    this.selectedIndex = 0;
    this.updateItemsCount();
    this.render();

    const first = this.filteredOptions[0];
    if (first) {
      this.requestPreview(first);
    } else {
      this.previewManager.clearPreview();
      this.previewManager.renderNoPreviewData();
    }
  }

  public moveSelection(direction: number): void {
    if (this.filteredOptions.length === 0) return;

    this.selectedIndex = (this.selectedIndex + direction + this.filteredOptions.length) % this.filteredOptions.length;

    this.render();

    const selectedOption = this.filteredOptions[this.selectedIndex];
    this.requestPreview(selectedOption);
  }

  public getSelectedValue(): string | undefined {
    if (!this.currentAdapter || this.filteredOptions.length === 0) return undefined;

    const option = this.filteredOptions[this.selectedIndex];
    return this.currentAdapter.getSelectionValue(option);
  }

  private shouldUseVirtualization(): boolean {
    return this.filteredOptions.length > this.RENDER_THRESHOLD;
  }

  private render(): void {
    if (!this.currentAdapter) return;

    if (this.shouldUseVirtualization()) {
      this.listElement.classList.remove("flexbox-render");

      this.virtualizer.renderVirtualized(this.filteredOptions, this.selectedIndex, this.query, (item, idx, q) =>
        this.createListItem(item, idx, q),
      );

      requestAnimationFrame(() => {
        this.virtualizer.scrollToSelectedVirtualized(this.selectedIndex);
      });
    } else {
      this.virtualizer.clear();
      this.listElement.classList.add("flexbox-render");

      this.renderAll();
      this.scrollToSelectedNormal();
    }
  }

  private renderAll(): void {
    this.listElement.style.height = "";
    this.listElement.innerHTML = "";

    const fragment = document.createDocumentFragment();
    this.filteredOptions.forEach((option, idx) => {
      const li = this.createListItem(option, idx, this.query);
      fragment.appendChild(li);
    });
    this.listElement.appendChild(fragment);
  }

  private createListItem(option: any, idx: number, query: string): HTMLLIElement {
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

    return li;
  }

  private scrollToSelectedNormal(): void {
    const selected = this.listElement.querySelector(".option-item.selected") as HTMLElement | null;
    if (selected) {
      selected.scrollIntoView({ block: "center", behavior: "instant" });
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

  private requestPreview(option: any): void {
    if (!this.currentAdapter) return;
    const value = this.currentAdapter.getSelectionValue(option);
    this.previewManager.requestPreview(value);
  }

  private updateItemsCount(): void {
    if (this.itemsCountElement) {
      this.itemsCountElement.textContent = `${this.filteredOptions.length} / ${this.allOptions.length}`;
    }
  }
}
