import { debounce } from "../../utils/debounce";
import { escapeHtml } from "../../utils/html";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";
import { PreviewManager } from "../render/preview-manager";
import { Virtualizer } from "../render/virtualizer";
import { WebviewToExtensionMessenger } from "./wv-to-extension-messenger";

export class OptionListManager {
  private allOptions: any[] = [];
  private filteredOptions: any[] = [];
  private selectedIndex: number = 0;
  private dataAdapter: IFuzzyFinderDataAdapter | undefined;
  private query: string = "";

  private listElement: HTMLUListElement;
  private itemsCountElement: HTMLElement | null;

  private readonly RENDER_THRESHOLD = 200;
  private readonly RENDER_MODE_CLASSNAME = "flexbox-render";
  private readonly virtualizer: Virtualizer;
  private debouncedRequestPreview: (value: string) => void;

  constructor(private readonly previewManager: PreviewManager) {
    this.listElement = document.getElementById("option-list") as HTMLUListElement;
    this.itemsCountElement = document.getElementById("items-count");

    this.virtualizer = new Virtualizer(this.listElement, {
      itemHeight: 22,
      bufferSize: 10,
    });

    this.debouncedRequestPreview = debounce((value: string) => {
      this.previewManager.requestPreview(value);
    }, 50);

    this.setupScrollListener();
  }

  public setAdapter(adapter: IFuzzyFinderDataAdapter): void {
    this.dataAdapter = adapter;
  }

  public getAdapterDebounceTime(): number {
    if (this.dataAdapter && this.dataAdapter.debounceSearchTime) return this.dataAdapter.debounceSearchTime;
    return 50;
  }

  public setOptions(options: any[]): void {
    if (!this.dataAdapter) {
      console.error("[OptionListManager] No adapter set");
      return;
    }

    this.allOptions = options;
    this.filteredOptions = options;
    this.selectedIndex = this.getRelativeFirstIndex();
    this.query = "";
    this.updateItemsCount();
    this.render();

    const first = this.getRelativeFirstItem();
    if (first) this.requestPreview(first);
  }

  public filter(query: string): void {
    if (!this.dataAdapter) return;

    this.query = query.toLowerCase();

    if (this.dataAdapter.filterOption) {
      this.filteredOptions = this.allOptions.filter((opt) => this.dataAdapter.filterOption(opt, this.query));
    } else {
      this.filteredOptions = this.allOptions.filter((opt) => {
        const text = this.dataAdapter.getDisplayText(opt);
        return text.toLowerCase().includes(this.query);
      });
    }

    this.selectedIndex = this.getRelativeFirstIndex();
    this.updateItemsCount();
    this.render();

    const first = this.getRelativeFirstItem();
    if (first) {
      this.requestPreview(first);
    } else {
      this.previewManager.clearPreview();
    }
  }

  public moveSelectionUp() {
    this.moveSelection(this.renderMode === "fullrender" ? 1 : -1);
  }

  public moveSelectionDown() {
    this.moveSelection(this.renderMode === "fullrender" ? -1 : 1);
  }

  public getSelectedValue(): string | undefined {
    if (!this.dataAdapter || this.filteredOptions.length === 0) return undefined;

    const option = this.filteredOptions.at(this.selectedIndex);
    return this.dataAdapter.getSelectionValue(option);
  }

  public clearOptions(): void {
    this.allOptions = [];
    this.filteredOptions = [];
    this.selectedIndex = 0;
  }

  public onSelectionConfirmed() {
    const selectedValue = this.getSelectedValue();
    if (selectedValue) {
      WebviewToExtensionMessenger.instance.onOptionSelected(selectedValue);
    }
  }

  public resetIfNeeded() {
    if (this.query === "" && this.dataAdapter.fuzzyAdapterType === "workspace.text") {
      this.clearOptions();
      this.previewManager.clearPreview();
    }
  }

  private get renderMode() {
    return this.shouldUseVirtualization() ? "virtualized" : "fullrender";
  }

  private getRelativeFirstIndex(): number {
    return this.renderMode === "fullrender" ? 0 : this.filteredOptions.length - 1;
  }

  private getRelativeFirstItem() {
    return this.filteredOptions.at(this.getRelativeFirstIndex());
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

  private moveSelection(direction: number): void {
    if (this.filteredOptions.length === 0) return;

    this.selectedIndex = (this.selectedIndex + direction + this.filteredOptions.length) % this.filteredOptions.length;

    this.render();

    const selectedOption = this.filteredOptions.at(this.selectedIndex);
    this.requestPreview(selectedOption);
  }

  private shouldUseVirtualization(): boolean {
    return this.filteredOptions.length > this.RENDER_THRESHOLD;
  }

  private render(): void {
    if (!this.dataAdapter) return;

    this.filteredOptions.sort((opt1, opt2) => {
      const a = this.dataAdapter.getDisplayText(opt1).toLowerCase();
      const b = this.dataAdapter.getDisplayText(opt2).toLowerCase();

      const result = a.localeCompare(b);

      return this.renderMode === "fullrender" ? result : -result;
    });

    if (this.shouldUseVirtualization()) {
      this.listElement.classList.remove(this.RENDER_MODE_CLASSNAME);

      this.virtualizer.renderVirtualized(this.filteredOptions, this.selectedIndex, this.query, (item, idx, q) =>
        this.createListItem(item, idx, q),
      );

      requestAnimationFrame(() => {
        this.virtualizer.scrollToSelectedVirtualized(this.selectedIndex);
      });
    } else {
      this.virtualizer.clear();
      this.listElement.classList.add(this.RENDER_MODE_CLASSNAME);

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

    const displayText = this.dataAdapter.getDisplayText(option);
    li.innerHTML = this.highlightMatch(displayText, query);

    li.onclick = () => {
      this.selectedIndex = idx;
      this.render();
      this.onSelectionConfirmed();
    };

    return li;
  }

  private getIconClass(option: any): string {
    const ext = option.relative.split(".").pop()?.toLowerCase() || "";
    const map: Record<string, string> = {
      ts: "nf-dev-typescript",
      js: "nf-dev-javascript",
      py: "nf-dev-python",
      java: "nf-dev-java",
      html: "nf-dev-html5",
      css: "nf-dev-css3",
      md: "nf-dev-markdown",
    };
    return map[ext] || "nf-dev-file";
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
    if (!this.dataAdapter) return;
    const value = this.dataAdapter.getSelectionValue(option);
    this.debouncedRequestPreview(value);
  }

  private updateItemsCount(): void {
    if (this.itemsCountElement) {
      this.itemsCountElement.textContent = `${this.filteredOptions.length} / ${this.allOptions.length}`;
    }
  }
}
