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
  private scrollContainer: HTMLElement;

  constructor(previewManager: PreviewManager) {
    this.previewManager = previewManager;
    this.listElement = document.getElementById("option-list") as HTMLUListElement;
    this.searchElement = document.getElementById("search") as HTMLInputElement;
    this.fileCountElement = document.getElementById("file-count");

    // O scroll é no próprio elemento da lista
    this.scrollContainer = this.listElement;

    this.setupVirtualization();
  }

  private setupVirtualization(): void {
    // Calcula a altura do container
    this.updateContainerHeight();

    // Listener para scroll no container
    this.scrollContainer.addEventListener("scroll", () => {
      this.renderVisible();
    });

    // Atualiza altura quando a janela muda
    window.addEventListener("resize", () => {
      this.updateContainerHeight();
      this.renderVisible(); // Apenas re-renderiza os visíveis, não chama render()
    });
  }

  private updateContainerHeight(): void {
    // Força o recálculo do tamanho
    requestAnimationFrame(() => {
      this.containerHeight = this.scrollContainer.clientHeight;
    });
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

    this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.filteredOptions.length - 1));

    this.updateFileCount();
    this.render();

    const selectedOption = this.filteredOptions[this.selectedIndex];
    if (selectedOption) {
      this.previewManager.requestPreviewIfNeeded(selectedOption);
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
    // Remove estilos antigos
    this.listElement.style.position = "";
    this.listElement.style.height = "";

    // Limpa a lista
    this.listElement.innerHTML = "";

    // Cria um wrapper virtual interno
    const virtualWrapper = document.createElement("div");
    virtualWrapper.style.position = "relative";
    virtualWrapper.style.height = `${this.filteredOptions.length * this.ITEM_HEIGHT}px`;
    virtualWrapper.id = "virtual-wrapper";

    this.listElement.appendChild(virtualWrapper);

    // Scroll para o item selecionado
    this.scrollToSelected();

    // Renderiza itens visíveis
    this.renderVisible();
  }

  private renderVisible(): void {
    const scrollTop = this.scrollContainer.scrollTop;

    this.containerHeight = this.scrollContainer.clientHeight;

    this.visibleStartIndex = Math.max(0, Math.floor(scrollTop / this.ITEM_HEIGHT) - this.BUFFER_SIZE);
    this.visibleEndIndex = Math.min(
      this.filteredOptions.length,
      Math.ceil((scrollTop + this.containerHeight) / this.ITEM_HEIGHT) + this.BUFFER_SIZE,
    );

    // Busca ou cria o wrapper virtual
    let virtualWrapper = this.listElement.querySelector("#virtual-wrapper") as HTMLElement;
    if (!virtualWrapper) {
      virtualWrapper = document.createElement("div");
      virtualWrapper.style.position = "relative";
      virtualWrapper.style.height = `${this.filteredOptions.length * this.ITEM_HEIGHT}px`;
      virtualWrapper.id = "virtual-wrapper";
      this.listElement.appendChild(virtualWrapper);
    }

    // Atualiza a altura do wrapper caso tenha mudado
    virtualWrapper.style.height = `${this.filteredOptions.length * this.ITEM_HEIGHT}px`;

    // Limpa e renderiza apenas itens visíveis
    virtualWrapper.innerHTML = "";
    const query = this.searchElement.value.toLowerCase();

    const fragment = document.createDocumentFragment();

    for (let idx = this.visibleStartIndex; idx < this.visibleEndIndex; idx++) {
      const option = this.filteredOptions[idx];
      const li = document.createElement("li");
      li.className = "option-item";

      // Posiciona o item absolutamente dentro do wrapper
      li.style.position = "absolute";
      li.style.top = `${idx * this.ITEM_HEIGHT}px`;
      li.style.height = `${this.ITEM_HEIGHT}px`;
      li.style.width = "100%";
      li.style.left = "0";
      li.style.boxSizing = "border-box";

      if (idx === this.selectedIndex) {
        li.classList.add("selected");
      }

      li.innerHTML = this.highlightMatch(option, query);

      // Closure para capturar o índice correto
      ((index) => {
        li.onclick = () => {
          this.selectedIndex = index;
          this.renderVisible();
          this.notifySelection();
        };
      })(idx);

      fragment.appendChild(li);
    }

    virtualWrapper.appendChild(fragment);
  }

  private scrollToSelected(): void {
    const selectedTop = this.selectedIndex * this.ITEM_HEIGHT;
    this.scrollContainer.scrollTop = Math.max(0, selectedTop - this.containerHeight + this.ITEM_HEIGHT * 3);
  }

  private ensureSelectedVisible(): void {
    const selectedTop = this.selectedIndex * this.ITEM_HEIGHT;
    const selectedBottom = selectedTop + this.ITEM_HEIGHT;
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollBottom = scrollTop + this.containerHeight;

    // Margem de 1 item
    const margin = this.ITEM_HEIGHT;

    if (selectedTop < scrollTop + margin) {
      this.scrollContainer.scrollTop = Math.max(0, selectedTop - margin);
    } else if (selectedBottom > scrollBottom - margin) {
      this.scrollContainer.scrollTop = selectedBottom - this.containerHeight + margin;
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
