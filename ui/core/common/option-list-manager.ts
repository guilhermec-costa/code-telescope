import { debounce } from "../../utils/debounce";
import { escapeHtml } from "../../utils/html";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";
import { PreviewManager } from "../render/preview-manager";
import { Virtualizer } from "../render/virtualizer";
import { StateManager } from "./code/state-manager";
import { WebviewToExtensionMessenger } from "./wv-to-extension-messenger";

export class OptionListManager {
  private allOptions: any[] = [];
  private filteredOptions: any[] = [];
  private dataAdapter: IFuzzyFinderDataAdapter | undefined;

  private listElement: HTMLUListElement;
  private itemsCountElement: HTMLElement | null;

  private readonly RENDER_THRESHOLD = 200;
  private readonly RENDER_MODE_CLASSNAME = "flexbox-render";
  private readonly OPTION_ITEM_ID_PREFIX = "option-item-id-";
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
    }, 0);

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
    StateManager.selectedIndex = this.restoreSelectedIndex();
    StateManager.prompt = "";
    this.updateItemsCount();
    this.render();
    this.scrollToSelected();

    const first = this.getRelativeFirstItem();
    if (first) this.requestPreview(first);
  }

  public filter(query: string): void {
    if (!this.dataAdapter) return;

    StateManager.prompt = query.toLowerCase();

    if (this.dataAdapter.filterOption) {
      this.filteredOptions = this.allOptions.filter((opt) => this.dataAdapter.filterOption(opt, StateManager.prompt));
    } else {
      this.filteredOptions = this.allOptions.filter((opt) => {
        const text = this.dataAdapter.getDisplayText(opt);
        return text.toLowerCase().includes(StateManager.prompt);
      });
    }

    StateManager.selectedIndex = this.getRelativeFirstIndex();
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

    const option = this.filteredOptions.at(StateManager.selectedIndex);
    return this.dataAdapter.getSelectionValue(option);
  }

  public clearOptions(): void {
    this.allOptions = [];
    this.filteredOptions = [];
    StateManager.selectedIndex = 0;
  }

  public onSelectionConfirmed() {
    const selectedValue = this.getSelectedValue();
    if (selectedValue) {
      WebviewToExtensionMessenger.instance.onOptionSelected(selectedValue);
    }
  }

  public resetIfNeeded() {
    if (StateManager.prompt === "" && this.dataAdapter.fuzzyAdapterType === "workspace.text") {
      this.clearOptions();
      this.previewManager.clearPreview();
    }
  }

  private get renderMode() {
    return this.shouldUseVirtualization() ? "virtualized" : "fullrender";
  }

  private restoreSelectedIndex(): number {
    if (StateManager.selectedIndex != 0) {
      return StateManager.selectedIndex;
    }
    return this.getRelativeFirstIndex();
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
        this.virtualizer.renderVirtualized(
          this.filteredOptions,
          StateManager.selectedIndex,
          StateManager.prompt,
          (item, idx, q) => this.createListItem(item, idx, q),
        );
      }
    });
  }

  private moveSelection(direction: number): void {
    if (this.filteredOptions.length === 0) return;

    const previousIndex = StateManager.selectedIndex;
    StateManager.selectedIndex =
      (StateManager.selectedIndex + direction + this.filteredOptions.length) % this.filteredOptions.length;

    const prevLi = document.getElementById(`${this.OPTION_ITEM_ID_PREFIX}${previousIndex}`);
    if (prevLi) {
      prevLi.classList.remove("selected");
    }

    const curLi = document.getElementById(`${this.OPTION_ITEM_ID_PREFIX}${StateManager.selectedIndex}`);
    if (curLi) {
      curLi.classList.add("selected");
    }

    this.scrollToSelected();
    const selectedOption = this.filteredOptions.at(StateManager.selectedIndex);
    this.requestPreview(selectedOption);
  }

  private scrollToSelected() {
    if (this.shouldUseVirtualization()) {
      requestAnimationFrame(() => {
        this.virtualizer.scrollToSelectedVirtualized(StateManager.selectedIndex);
      });
    } else {
      this.scrollToSelectedNormal();
    }
  }

  private shouldUseVirtualization(): boolean {
    return this.filteredOptions.length > this.RENDER_THRESHOLD;
  }

  private applySortOnFiltered() {
    this.filteredOptions.sort((opt1, opt2) => {
      const a = this.dataAdapter.getDisplayText(opt1).toLowerCase();
      const b = this.dataAdapter.getDisplayText(opt2).toLowerCase();

      const result = a.localeCompare(b);

      return this.renderMode === "fullrender" ? result : -result;
    });
  }

  private render(): void {
    this.applySortOnFiltered();
    if (!this.dataAdapter) return;

    if (this.shouldUseVirtualization()) {
      this.listElement.classList.remove(this.RENDER_MODE_CLASSNAME);

      this.virtualizer.renderVirtualized(
        this.filteredOptions,
        StateManager.selectedIndex,
        StateManager.prompt,
        (item, idx, q) => this.createListItem(item, idx, q),
      );
    } else {
      this.virtualizer.clear();
      this.listElement.classList.add(this.RENDER_MODE_CLASSNAME);

      this.renderAll();
    }
  }

  private renderAll(): void {
    this.listElement.style.height = "";
    this.listElement.innerHTML = "";

    const fragment = document.createDocumentFragment();
    this.filteredOptions.forEach((option, idx) => {
      const li = this.createListItem(option, idx, StateManager.prompt);
      fragment.appendChild(li);
    });
    this.listElement.appendChild(fragment);
  }

  private createListItem(option: any, idx: number, query: string): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "option-item";
    li.id = `${this.OPTION_ITEM_ID_PREFIX}${idx}`;

    if (idx === StateManager.selectedIndex) {
      li.classList.add("selected");
    }

    const displayText = this.dataAdapter.getDisplayText(option);
    li.innerHTML = this.highlightMatch(displayText, query);

    li.onclick = () => {
      StateManager.selectedIndex = idx;
      this.onSelectionConfirmed();
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

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    const i = lowerText.indexOf(lowerQuery);
    if (i === -1) return escapeHtml(text);

    const escaped = escapeHtml(text);

    return (
      escaped.slice(0, i) +
      `<span class="highlight">${escaped.slice(i, i + query.length)}</span>` +
      escaped.slice(i + query.length)
    );
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
