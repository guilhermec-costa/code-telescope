import { IFuzzyFinderDataAdapter } from "../../../shared/abstractions/fuzzy-finder-data-adapter";
import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { debounce } from "../../utils/debounce";
import { escapeHtml } from "../../utils/html";
import { computeMatch, MatchResult } from "../algos/score-engine";
import { PreviewManager } from "../render/preview-manager";
import { Virtualizer } from "../render/virtualizer";
import { SessionStateManager } from "./code/state-manager";
import { WebviewToExtensionMessenger } from "./wv-to-extension-messenger";

/**
 * Manages the option list lifecycle inside the webview.
 */
export class OptionListManager {
  private allOptions: any[] = [];
  private filteredOptions: any[] = [];
  private dataAdapter: IFuzzyFinderDataAdapter | undefined;
  private readonly searchElement: HTMLInputElement;
  private static _instance: OptionListManager | undefined;
  private lastOption: any | undefined;
  private lastFilterQuery: string = "";

  private listElement: HTMLUListElement;
  private itemsCountElement: HTMLElement | null;

  private _selectedIndex: number = 0;

  private set selectedIndex(value: number) {
    this._selectedIndex = value;
    SessionStateManager.patch({
      selectedIndex: this._selectedIndex,
    });
  }

  private get selectedIndex(): number {
    return this._selectedIndex;
  }

  private readonly OPTION_ITEM_ID_PREFIX = "option-item-id-";
  private matchCache = new Map<string, MatchResult>();
  private matchCacheScope = "";

  private readonly virtualizer: Virtualizer;

  private getPreviewerDebounceTime(): number {
    switch (__PROVIDER__ as FuzzyProviderType) {
      case "workspace.packageDocs":
        return 250;
      case "workspace.colorschemes":
        return 250;
      default:
        return 0;
    }
  }

  private debouncedRequestPreview = debounce((value: string) => {
    PreviewManager.instance.requestPreview(value);
  }, this.getPreviewerDebounceTime());

  private constructor() {
    this.listElement = document.getElementById("option-list") as HTMLUListElement;
    this.itemsCountElement = document.getElementById("items-count");
    this.searchElement = document.getElementById("search") as HTMLInputElement;

    this.virtualizer = new Virtualizer(this.listElement, {
      itemHeight: 22,
      bufferSize: 10,
    });

    this.setupScrollListener();
  }

  static get instance() {
    if (!this._instance) {
      this._instance = new OptionListManager();
    }
    return this._instance;
  }

  /**
   * Returns true if ivy layout is active
   */
  private isIvyLayout(): boolean {
    return SessionStateManager.layoutMode === "ivy";
  }

  /**
   * Sets the data adapter responsible for interpreting and filtering options.
   */
  public setAdapter(adapter: IFuzzyFinderDataAdapter): void {
    this.dataAdapter = adapter;
  }

  public appendChunk(chunk: any[], totalLimit: number): void {
    const wasEmpty = this.allOptions.length === 0;
    this.allOptions.push(...chunk);

    if (this.searchElement.value === "") {
      this.filteredOptions = this.allOptions;
    } else {
      this.resetMatchCacheIfNeeded(this.searchElement.value);
      const newFiltered = chunk.filter((opt) => {
        const text = this.dataAdapter!.getSearchText(opt);
        return this.getMatchResult(this.searchElement.value, text).score > -Infinity;
      });
      this.filteredOptions.push(...newFiltered);
    }

    this.updateItemsCount();
    this.selectedIndex = this.getRelativeFirstIndex();

    const isComplete = this.allOptions.length >= totalLimit;
    if (isComplete || wasEmpty) {
      this.render();
      const first = this.getRelativeFirstItem();
      if (first) this.requestPreview(first);
    }
    this.virtualizer.scrollToSelectedVirtualized(this.selectedIndex);
  }

  public filter(query: string): void {
    if (!this.dataAdapter) return;
    this.resetMatchCacheIfNeeded(query);

    const lowerQuery = query.toLowerCase();
    const lowerLast = this.lastFilterQuery.toLowerCase();

    // if the query is an extension of the previous query,
    // filter only over the current filtered options, not over all the options
    const sourceList =
      lowerQuery.startsWith(lowerLast) && lowerLast.length > 0 ? this.filteredOptions : this.allOptions;

    this.filteredOptions = sourceList.filter((opt) => {
      const text = this.dataAdapter!.getSearchText(opt);
      return this.getMatchResult(query, text).score > -Infinity;
    });

    this.lastFilterQuery = query;
    this.selectedIndex = this.getRelativeFirstIndex();

    this.virtualizer.scrollToSelectedVirtualized(this.selectedIndex);
    this.render();
    this.virtualizer.scrollToSelectedVirtualized(this.selectedIndex);
    this.updateItemsCount();

    const first = this.getRelativeFirstItem();
    if (first) {
      this.requestPreview(first);
    }

    if (this.filteredOptions.length === 0) {
      PreviewManager.instance.clearPreview();
      this.lastOption = undefined;
      return;
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
  public getSelectedValue(): any | undefined {
    if (!this.dataAdapter || this.filteredOptions.length === 0) return undefined;

    const option = this.filteredOptions.at(this.selectedIndex);
    return this.dataAdapter.getSelectionValue(option);
  }

  public clearOptions(): void {
    this.allOptions = [];
    this.filteredOptions = [];
    this.selectedIndex = 0;
    this.matchCache.clear();
    this.matchCacheScope = "";
    this.updateItemsCount();
    this.render();
  }

  /**
   * Confirms the current selection and notifies the extension.
   */
  public onSelectionConfirmed() {
    const selectedValue = this.getSelectedValue();
    if (selectedValue) {
      WebviewToExtensionMessenger.instance.onOptionSelected(selectedValue, SessionStateManager.read());
    }
  }

  public resetIfNeeded() {
    const needReset: FuzzyProviderType[] = ["workspace.text", "currentFile.text"];
    if (this.searchElement.value === "" && needReset.includes(__PROVIDER__ as FuzzyProviderType)) {
      this.clearOptions();
      PreviewManager.instance.clearPreview();
    }
  }

  public isEmpty() {
    return this.filteredOptions.length === 0 || this.allOptions.length === 0;
  }

  private getRelativeFirstIndex(): number {
    if (
      __INITIAL_SELECTED_INDEX__ != undefined &&
      __INITIAL_SELECTED_INDEX__ >= 0 &&
      __INITIAL_SELECTED_INDEX__ <= this.filteredOptions.length - 1
    ) {
      return __INITIAL_SELECTED_INDEX__;
    }

    const isIvy = this.isIvyLayout();

    // in ivy layout, index 0 is the last visually
    // in default layout, index N-1 is the last visually
    return isIvy ? 0 : this.filteredOptions.length - 1;
  }

  private getRelativeFirstItem() {
    return this.filteredOptions.at(this.getRelativeFirstIndex());
  }

  private setupScrollListener(): void {
    const renderVirtualized = () => {
      this.virtualizer.renderVirtualized(this.filteredOptions, this.searchElement.value, (item, idx, q) =>
        this.createListItem(item, idx, q),
      );
    };

    this.listElement.addEventListener("scroll", renderVirtualized);

    const resizeObserver = new ResizeObserver(() => {
      this.scrollToSelected();
      renderVirtualized();
    });

    resizeObserver.observe(this.listElement);
  }

  private moveSelection(direction: number): void {
    if (this.filteredOptions.length === 0) return;

    const previousIndex = this.selectedIndex;
    this.selectedIndex = (this.selectedIndex + direction + this.filteredOptions.length) % this.filteredOptions.length;

    this.scrollToSelected();

    requestAnimationFrame(() => {
      const prevLi = document.getElementById(`${this.OPTION_ITEM_ID_PREFIX}${previousIndex}`);
      prevLi?.classList.remove("selected");

      const curLi = document.getElementById(`${this.OPTION_ITEM_ID_PREFIX}${this.selectedIndex}`);
      curLi?.classList.add("selected");
    });

    const selectedOption = this.filteredOptions.at(this.selectedIndex);
    this.requestPreview(selectedOption);
  }

  /**
   * Scrolls the list to keep the selected item visible.
   */
  private scrollToSelected() {
    this.virtualizer.scrollToSelectedVirtualized(this.selectedIndex);
  }

  private applySortOnOptions(options: any[], query: string) {
    const isIvy = this.isIvyLayout();
    const customSort = this.dataAdapter!.sortFn;

    if (customSort) {
      options.sort((opt1, opt2) => {
        const result = customSort(opt1, opt2);
        return isIvy ? -result : result;
      });
      return;
    }

    if (!query) return;

    const lowerQuery = query.toLowerCase();
    const limit = 5000;
    const hasOverflow = options.length > limit;
    const workingSet = hasOverflow ? options.slice(0, limit) : options;
    this.resetMatchCacheIfNeeded(lowerQuery);

    const scored = workingSet.map((opt) => ({
      opt,
      score: this.getMatchResult(lowerQuery, this.dataAdapter!.getSearchText(opt)).score,
    }));

    scored.sort((a, b) => {
      const result = a.score - b.score;
      return isIvy ? -result : result;
    });

    for (let i = 0; i < workingSet.length; i++) {
      options[i] = scored[i].opt;
    }
  }

  /**
   * Renders the option list using virtualization.
   */
  render(): void {
    if (!this.dataAdapter) return;
    const perfStart = performance.now();

    const shouldSort = this.dataAdapter.shouldSort ?? true;
    if (shouldSort) {
      this.applySortOnOptions(this.filteredOptions, this.searchElement.value);
    }
    this.selectedIndex = this.getRelativeFirstIndex();
    const afterSort = performance.now();

    const itemsCount = this.filteredOptions.length;

    this.virtualizer.renderVirtualized(this.filteredOptions, this.searchElement.value, (item, idx, q) =>
      this.createListItem(item, idx, q),
    );

    const afterRender = performance.now();

    console.log(
      `[Code Telescope][Render] items=${itemsCount} ` +
        `sort=${(afterSort - perfStart).toFixed(2)}ms ` +
        `virtualize=${(afterRender - afterSort).toFixed(2)}ms `,
    );
  }

  /**
   * Creates a DOM list item for an option.
   */
  private createListItem(option: any, idx: number, query: string): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "option-item";
    li.id = `${this.OPTION_ITEM_ID_PREFIX}${idx}`;

    if (idx === this.selectedIndex) {
      li.classList.add("selected");
    }

    const searchText = this.dataAdapter!.getSearchText(option);
    const offset = this.dataAdapter!.calcHlOffsetChars?.(option) ?? 0;
    const highlightedContent = this.highlightMatch(searchText, query.toLowerCase(), offset);

    li.innerHTML = this.dataAdapter!.getHtmlWrapper(option, highlightedContent);

    li.onclick = () => {
      this.selectedIndex = idx;
      this.onSelectionConfirmed();
    };

    return li;
  }

  /**
   * Highlights matches in text.
   */
  private highlightMatch(text: string, query: string, offset: number = 0): string {
    if (!query) return escapeHtml(text);

    const matchIndices = this.getMatchResult(query, text.slice(offset)).indices;
    if (matchIndices.length === 0) {
      return escapeHtml(text);
    }

    let result = "";

    result += escapeHtml(text.slice(0, offset));
    let lastIdx = offset;

    for (let i = 0; i < matchIndices.length; i++) {
      const idx = matchIndices[i] + offset;
      result += escapeHtml(text.slice(lastIdx, idx));
      result += `<span class="highlight">${escapeHtml(text.slice(idx, idx + 1))}</span>`;
      lastIdx = idx + 1;
    }
    result += escapeHtml(text.slice(lastIdx));

    return result;
  }

  private resetMatchCacheIfNeeded(query: string): void {
    const scope = `${SessionStateManager.matchingAlgorithm}::${query.toLowerCase()}`;

    if (scope !== this.matchCacheScope) {
      this.matchCache.clear();
      this.matchCacheScope = scope;
    }
  }

  private getMatchResult(query: string, text: string): MatchResult {
    if (!query) return { score: 0, indices: [] };
    if (!text) return { score: -Infinity, indices: [] };

    const lowerQuery = query.toLowerCase();
    const key = `${lowerQuery}\u0000${text}`;
    const cached = this.matchCache.get(key);

    if (cached) return cached;

    const result = computeMatch(lowerQuery, text);
    this.matchCache.set(key, result);
    return result;
  }

  private requestPreview(option: any): void {
    if (!this.dataAdapter || option === this.lastOption) return;
    const value = this.dataAdapter.getSelectionValue(option);
    this.lastOption = option;
    this.debouncedRequestPreview(value);
  }

  private updateItemsCount(): void {
    if (this.itemsCountElement) {
      this.itemsCountElement.textContent = `${this.filteredOptions.length} / ${this.allOptions.length}`;
    }
  }
}
