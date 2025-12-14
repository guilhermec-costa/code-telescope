export interface VirtualizerOptions {
  itemHeight: number;
  bufferSize: number;
}

export class Virtualizer {
  private container: HTMLElement;
  private itemHeight: number;
  private bufferSize: number;

  constructor(container: HTMLElement, options: VirtualizerOptions = { itemHeight: 22, bufferSize: 10 }) {
    this.container = container;
    this.itemHeight = options.itemHeight;
    this.bufferSize = options.bufferSize;

    this.container.style.position = "relative";
  }

  public renderVirtualized(
    items: any[],
    selectedIndex: number,
    query: string,
    createItem: (item: any, index: number, query: string) => HTMLElement,
  ): void {
    if (items.length === 0) {
      this.clear();
      return;
    }

    const totalHeight = items.length * this.itemHeight;
    this.container.style.height = `${totalHeight}px`;

    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight;

    let startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.bufferSize);
    let endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.bufferSize);

    if (selectedIndex >= 0) {
      if (selectedIndex < startIndex) {
        startIndex = Math.max(0, selectedIndex - this.bufferSize);
      }
      if (selectedIndex >= endIndex) {
        endIndex = Math.min(items.length, selectedIndex + this.bufferSize + 1);
      }
    }

    this.container.innerHTML = "";

    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const item = items[i];
      const li = createItem(item, i, query);

      li.style.position = "absolute";
      li.style.top = `${i * this.itemHeight}px`;
      li.style.left = "0";
      li.style.width = "100%";
      li.style.height = `${this.itemHeight}px`;

      fragment.appendChild(li);
    }

    this.container.appendChild(fragment);
  }

  public scrollToSelectedVirtualized(selectedIndex: number): void {
    if (selectedIndex < 0) return;

    const viewportHeight = this.container.clientHeight;
    const targetTop = selectedIndex * this.itemHeight;

    let desiredScrollTop = targetTop - viewportHeight / 2 + this.itemHeight / 2;
    desiredScrollTop = Math.max(0, desiredScrollTop);
    desiredScrollTop = Math.min(desiredScrollTop, this.container.scrollHeight - viewportHeight);

    this.container.scrollTop = desiredScrollTop;
  }

  public clear(): void {
    this.container.innerHTML = "";
    this.container.style.height = "";
  }
}
