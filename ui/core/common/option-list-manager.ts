import { debounce } from "../../utils/debounce";
import { escapeHtml } from "../../utils/html";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";
import { PreviewManager } from "../render/preview-manager";
import { Virtualizer } from "../render/virtualizer";
import { StateManager } from "./code/state-manager";
import { WebviewToExtensionMessenger } from "./wv-to-extension-messenger";

/**
 * Manages the option list lifecycle inside the webview.
 *
 * Responsibilities:
 * - Hold all options and filtered options
 * - Apply filtering, sorting and selection logic
 * - Use virtualized rendering
 * - Synchronize selection with preview requests
 */
export class OptionListManager {
  private allOptions: any[] = [];
  private filteredOptions: any[] = [];
  private dataAdapter: IFuzzyFinderDataAdapter | undefined;

  private listElement: HTMLUListElement;
  private itemsCountElement: HTMLElement | null;
  private oversizedOptionsExcluded = false;

  /** Prefix used to generate DOM ids for option items */
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

  /**
   * Returns true if ivy layout is active
   */
  private isIvyLayout(): boolean {
    return StateManager.layoutMode === "ivy";
  }

  /**
   * Sets the data adapter responsible for interpreting and filtering options.
   */
  public setAdapter(adapter: IFuzzyFinderDataAdapter): void {
    this.dataAdapter = adapter;
  }

  /**
   * Returns the debounce time used when filtering/searching,
   */
  public getAdapterSearchDebounceTime(): number {
    if (this.dataAdapter && this.dataAdapter.debounceSearchTime) return this.dataAdapter.debounceSearchTime;
    return 50;
  }

  /**
   * Initializes the option list with a new dataset.
   * Resets state, renders items and requests preview for the first option.
   */
  public setOptions(options: any[], updateItemsCount: boolean = true): void {
    if (!this.dataAdapter) {
      console.error("[OptionListManager] No adapter set");
      return;
    }

    this.allOptions = options;
    this.filteredOptions = options;
    StateManager.selectedIndex = this.restoreSelectedIndex();
    StateManager.prompt = "";
    if (updateItemsCount) {
      this.updateItemsCount();
    }
    this.render();

    const first = this.getRelativeFirstItem();
    if (first) this.requestPreview(first);
  }

  /**
   * Filters options based on the provided query.
   * Uses adapter-specific filtering if available.
   */
  public filter(query: string): void {
    if (!this.dataAdapter) return;

    if (!this.oversizedOptionsExcluded && StateManager.prompt === "") {
      this.excludeOptionsByPaths(StateManager.pathsToExclude ?? []);
    }

    StateManager.prompt = query.toLowerCase();

    this.filteredOptions = this.allOptions.filter((opt) => this.dataAdapter.filterOption(opt, StateManager.prompt));

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
    this.moveSelection(-1);
  }

  public moveSelectionDown() {
    this.moveSelection(1);
  }

  /**
   * Returns the selection value for the currently selected option.
   */
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

  /**
   * Confirms the current selection and notifies the extension.
   */
  public onSelectionConfirmed() {
    const selectedValue = this.getSelectedValue();
    if (selectedValue) {
      WebviewToExtensionMessenger.instance.onOptionSelected(selectedValue);
    }
  }

  /**
   * Clears options and preview when required by specific adapters.
   */
  public resetIfNeeded() {
    if (StateManager.prompt === "" && this.dataAdapter.fuzzyAdapterType === "workspace.text") {
      this.clearOptions();
      this.previewManager.clearPreview();
    }
  }

  /**
   * Returns the first index for virtualized mode.
   */
  private restoreSelectedIndex(): number {
    if (StateManager.selectedIndex != 0) {
      return StateManager.selectedIndex;
    }
    return this.getRelativeFirstIndex();
  }

  private getRelativeFirstIndex(): number {
    const isIvy = this.isIvyLayout();

    // No ivy, index 0 é o último item visualmente
    // No default, index N-1 é o último item visualmente
    return isIvy ? 0 : this.filteredOptions.length - 1;
  }

  private getRelativeFirstItem() {
    return this.filteredOptions.at(this.getRelativeFirstIndex());
  }

  private setupScrollListener(): void {
    this.listElement.addEventListener("scroll", () => {
      this.virtualizer.renderVirtualized(this.filteredOptions, StateManager.prompt, (item, idx, q) =>
        this.createListItem(item, idx, q),
      );
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

  /**
   * Scrolls the list to keep the selected item visible.
   */
  private scrollToSelected() {
    requestAnimationFrame(() => {
      this.virtualizer.scrollToSelectedVirtualized(StateManager.selectedIndex);
    });
  }

  private applySortOnFiltered() {
    const isIvy = this.isIvyLayout();
    const customSort = this.dataAdapter.sortFn;

    this.filteredOptions.sort((opt1, opt2) => {
      let result: number;

      if (customSort) {
        result = customSort(opt1, opt2);
      } else {
        const a = this.dataAdapter.getSelectionValue(opt1).toLowerCase();
        const b = this.dataAdapter.getSelectionValue(opt2).toLowerCase();
        result = a.localeCompare(b);
      }

      return isIvy ? -result : result;
    });
  }

  /**
   * Renders the option list using virtualization.
   */
  private render(): void {
    this.applySortOnFiltered();
    if (!this.dataAdapter) return;

    this.virtualizer.renderVirtualized(this.filteredOptions, StateManager.prompt, (item, idx, q) =>
      this.createListItem(item, idx, q),
    );

    this.scrollToSelected();
  }

  /**
   * Creates a DOM list item for an option.
   */
  private createListItem(option: any, idx: number, query: string): HTMLLIElement {
    console.log("Index: ", idx);
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

  /**
   * Highlights matches in text that contains an icon.
   */
  private highlightMatch(text: string, query: string): string {
    if (!query) return text;

    // icon structure
    if (text.includes("<i class=") || text.includes("<i>")) {
      return this.highlightMatchWithIcon(text, query);
    }

    // only text
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

  /**
   * Highlights matches in text that contains an icon.
   */
  private highlightMatchWithIcon(html: string, query: string): string {
    // white spaces/lb
    const cleanHtml = html.replace(/\s+/g, " ").trim();

    // icon match
    // everything between <i and </i>
    const iconMatch = cleanHtml.match(/^(<i[^>]*>.*?<\/i>)/);

    if (!iconMatch) {
      return html;
    }

    const icon = iconMatch[1];

    // match text in span
    const pathMatch = cleanHtml.match(/<span class="file-path">([^<]+)<\/span>/);

    if (!pathMatch) return html;

    const path = pathMatch[1];
    const lowerPath = path.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const i = lowerPath.indexOf(lowerQuery);

    if (i === -1) {
      return cleanHtml;
    }

    // highlight only in path
    const beforeMatch = path.slice(0, i);
    const match = path.slice(i, i + query.length);
    const afterMatch = path.slice(i + query.length);

    const highlightedPath =
      escapeHtml(beforeMatch) + `<span class="highlight">${escapeHtml(match)}</span>` + escapeHtml(afterMatch);

    return `${icon}<span class="file-path">${highlightedPath}</span>`;
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

  private excludeOptionsByPaths(pathList: string[]) {
    if (this.oversizedOptionsExcluded) return;

    const set = new Set(pathList);

    this.allOptions = this.allOptions.filter((option) => !set.has(option.absolute));

    this.filteredOptions = this.filteredOptions.filter((option) => !set.has(option.absolute));

    this.oversizedOptionsExcluded = true;
  }
}
