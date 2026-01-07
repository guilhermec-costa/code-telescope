export interface VirtualizerOptions {
  itemHeight: number;
  bufferSize: number;
}

export class Virtualizer {
  private container: HTMLElement;
  private spacer: HTMLElement;
  private itemHeight: number;
  private bufferSize: number;

  constructor(container: HTMLElement, options: VirtualizerOptions = { itemHeight: 22, bufferSize: 5 }) {
    this.container = container;
    this.itemHeight = options.itemHeight;
    this.bufferSize = options.bufferSize;

    // viewport setup
    this.container.style.position = "relative";
    this.container.style.overflowY = "auto";
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";

    // spacer = virtual content height
    this.spacer = document.createElement("div");
    this.spacer.style.position = "relative";
    this.spacer.style.width = "100%";
    this.container.appendChild(this.spacer);
  }

  private isIvyLayout(): boolean {
    return document.body.dataset.layout === "ivy";
  }

  public renderVirtualized(
    items: any[],
    selectedIndex: number,
    query: string,
    createItem: (item: any, index: number, query: string) => HTMLElement,
  ): void {
    if (!this.spacer.parentElement) {
      this.container.appendChild(this.spacer);
    }

    if (items.length === 0) {
      this.spacer.style.height = "0px";
      this.spacer.innerHTML = "";
      return;
    }

    const isIvy = this.isIvyLayout();
    const totalHeight = items.length * this.itemHeight;
    const viewportHeight = this.container.clientHeight;

    this.spacer.style.height = `${totalHeight}px`;

    if (isIvy) {
      this.spacer.style.marginTop = "0";
      this.spacer.style.marginBottom = "auto";
      this.spacer.style.minHeight = `${totalHeight}px`;
    } else {
      this.spacer.style.marginTop = "auto";
      this.spacer.style.marginBottom = "0";
      const minHeight = Math.max(totalHeight, viewportHeight);
      this.spacer.style.minHeight = `${minHeight}px`;
    }

    const scrollTop = this.container.scrollTop;
    const effectiveScrollTop = !isIvy && totalHeight < viewportHeight ? 0 : scrollTop;

    // Calcula a janela de renderização baseada APENAS no scroll
    const startIndex = Math.max(0, Math.floor(effectiveScrollTop / this.itemHeight) - this.bufferSize);
    const endIndex = Math.min(
      items.length,
      Math.ceil((effectiveScrollTop + viewportHeight) / this.itemHeight) + this.bufferSize,
    );

    // Limpa apenas o conteúdo do spacer
    this.spacer.innerHTML = "";

    const fragment = document.createDocumentFragment();

    // Calcula o offset para posicionar os itens baseado no layout
    let topOffset = 0;
    if (!isIvy && totalHeight < viewportHeight) {
      topOffset = viewportHeight - totalHeight;
    }

    for (let i = startIndex; i < endIndex; i++) {
      const li = createItem(items[i], i, query);
      li.style.position = "absolute";
      li.style.top = `${topOffset + i * this.itemHeight}px`;
      li.style.left = "0";
      li.style.right = "0";
      li.style.width = "100%";
      li.style.height = `${this.itemHeight}px`;
      li.style.boxSizing = "border-box";
      fragment.appendChild(li);
    }

    this.spacer.appendChild(fragment);
  }

  public scrollToSelectedVirtualized(selectedIndex: number): void {
    if (selectedIndex < 0) return;

    const totalHeight = this.spacer.scrollHeight;
    const viewportHeight = this.container.clientHeight;
    const isIvy = this.isIvyLayout();

    // Se o conteúdo é menor que a viewport e não é ivy, não precisa fazer scroll
    if (!isIvy && totalHeight <= viewportHeight) {
      this.container.scrollTop = 0;
      return;
    }

    const itemTop = selectedIndex * this.itemHeight;
    const itemBottom = itemTop + this.itemHeight;

    const scrollTop = this.container.scrollTop;
    const scrollBottom = scrollTop + viewportHeight;

    // Adiciona uma margem de segurança para ivy
    const margin = isIvy ? this.itemHeight : 0;

    // Só ajusta o scroll se o item não estiver visível
    if (itemTop < scrollTop + margin) {
      // Item está acima da viewport
      this.container.scrollTop = Math.max(0, itemTop - margin);
    } else if (itemBottom > scrollBottom - margin) {
      // Item está abaixo da viewport
      this.container.scrollTop = itemBottom - viewportHeight + margin;
    }
  }

  public clear(): void {
    // Limpa apenas o conteúdo, mantém a estrutura
    this.spacer.innerHTML = "";
    this.spacer.style.height = "0px";
    this.spacer.style.minHeight = "0px";
    this.container.scrollTop = 0;
  }
}
