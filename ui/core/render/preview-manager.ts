import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewManagerConfig } from "../../../shared/exchange/extension-config";
import { PreviewChunkMessage, PreviewCompleteMessage, PreviewData } from "../../../shared/extension-webview-protocol";
import { centerElementVertically } from "../../utils/scroll";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { WebviewToExtensionMessenger } from "../common/wv-to-extension-messenger";
import { PreviewRendererAdapterRegistry } from "../registry/preview-adapter.registry";

/**
 * Manages the preview panel lifecycle inside the webview.
 */
export class PreviewManager {
  private previewElement: HTMLElement;
  private adapter: IPreviewRendererAdapter | null = null;
  private cfg: PreviewManagerConfig = __PREVIEW_CFG__;
  private static _instance: PreviewManager | undefined = undefined;
  private activeRequestId = 0;

  private chunkStore = {
    requestId: 0,
    chunks: [] as Array<string | undefined>,
    received: new Set<number>(),
    total: 0,
    reset() {
      this.requestId = 0;
      this.chunks = [];
      this.received.clear();
      this.total = 0;
    },
  };

  private constructor() {
    console.log("[PreviewManager] Initializing");
    this.previewElement = document.getElementById("preview")!;
  }

  static get instance() {
    if (!this._instance) {
      this._instance = new PreviewManager();
    }
    return this._instance;
  }

  /** Horizontal scroll step divisor (e.g. "1/4" → 4) */
  private get horizontalScrollFraction() {
    return +this.cfg.horizontalScrollFraction.split("/")[1];
  }

  /** Vertical scroll step divisor (e.g. "1/4" → 4) */
  private get verticalScrollFraction() {
    return +this.cfg.verticalScrollFraction.split("/")[1];
  }

  setAdapter(adapter: IPreviewRendererAdapter) {
    this.adapter = adapter;
  }

  async updatePreview(data: PreviewData, finderType: PreviewRendererType, requestId?: number): Promise<void> {
    if (requestId !== undefined && requestId !== this.activeRequestId) return;
    let adapter = data.overridePreviewer
      ? PreviewRendererAdapterRegistry.instance.getAdapter(data.overridePreviewer)
      : PreviewRendererAdapterRegistry.instance.getAdapter(finderType);
    const finalPreviewerType = data.overridePreviewer ?? finderType;

    this.clearPreview();

    if (finderType === "preview.none" || data.overridePreviewer === "preview.none") {
      this.hidePreviewPanel();
      return;
    }

    this.showPreviewPanel();

    if (!adapter) {
      console.error(`No adapter found for finder type: ${finderType}`);
      console.log("Available adapters:", PreviewRendererAdapterRegistry.instance.getRegisteredTypes());
      return;
    }

    this.setAdapter(adapter);

    await this.adapter.render(this.previewElement, data);

    if (finalPreviewerType !== "preview.buffer") {
      requestAnimationFrame(() => {
        this.scrollToHighlighted();
      });
    }
  }

  hidePreviewPanel() {
    const previewSide = document.getElementById("preview-side");
    if (previewSide) {
      previewSide.style.display = "none";
    }
    const verticalResizer = document.getElementById("vertical-resizer");
    if (verticalResizer) {
      verticalResizer.style.display = "none";
    }
    // Classic layout
    const resultsContainer = document.getElementById("results-container");
    if (resultsContainer) {
      resultsContainer.style.width = "100%";
    }
    // Ivy layout
    const searchResults = document.getElementById("search-results");
    if (searchResults) {
      searchResults.style.width = "100%";
    }
  }

  showPreviewPanel() {
    const previewSide = document.getElementById("preview-side");
    if (previewSide) {
      previewSide.style.display = "";
    }
    const verticalResizer = document.getElementById("vertical-resizer");
    if (verticalResizer) {
      verticalResizer.style.display = "";
    }
    // Classic layout
    const resultsContainer = document.getElementById("results-container");
    if (resultsContainer) {
      resultsContainer.style.width = "";
    }
    // Ivy layout
    const searchResults = document.getElementById("search-results");
    if (searchResults) {
      searchResults.style.width = "";
    }
  }

  clearPreview() {
    this.adapter?.cleanup?.();
    this.adapter = null;
    this.chunkStore.reset();
    this.previewElement.innerHTML = "";
  }

  requestPreview(selection: string): void {
    this.activeRequestId = WebviewToExtensionMessenger.instance.requestSelectionPreviewData(selection);
  }

  scrollToTop() {
    this.previewElement.scrollTop = 0;
  }

  /**
   * Scrolls preview to the highlighted line if present,
   * otherwise scrolls to top.
   */
  scrollToHighlighted() {
    const highlightedLine = this.previewElement.querySelector(".line.highlighted");
    if (!highlightedLine) {
      this.scrollToTop();
      return;
    }
    centerElementVertically(this.previewElement, highlightedLine, this.cfg.scrollBehavior);
  }

  private getPreviewHeight() {
    return this.previewElement.clientHeight;
  }

  private getPreviewWidth() {
    return this.previewElement.clientWidth;
  }

  scrollUp(): void {
    this.previewElement.scrollTop -= this.getPreviewHeight() / this.verticalScrollFraction;
  }

  scrollDown(): void {
    this.previewElement.scrollTop += this.getPreviewHeight() / this.verticalScrollFraction;
  }

  scrollLeft(): void {
    this.previewElement.scrollLeft -= this.getPreviewWidth() / this.horizontalScrollFraction;
  }

  scrollRight(): void {
    this.previewElement.scrollLeft += this.getPreviewWidth() / this.horizontalScrollFraction;
  }

  async handlePreviewChunk({ requestId, chunkIndex, totalChunks, content }: PreviewChunkMessage): Promise<void> {
    if (requestId !== this.activeRequestId) return;
    if (this.chunkStore.requestId !== requestId) {
      this.chunkStore.reset();
      this.chunkStore.requestId = requestId;
      this.chunkStore.chunks = new Array(totalChunks);
      this.chunkStore.total = totalChunks;
    }
    this.chunkStore.chunks[chunkIndex] = content;
    this.chunkStore.received.add(chunkIndex);
  }

  async handlePreviewComplete({
    requestId,
    previewAdapterType,
    language,
    theme,
    metadata,
  }: PreviewCompleteMessage): Promise<void> {
    if (requestId !== this.activeRequestId || this.chunkStore.requestId !== requestId) return;
    const isComplete = this.chunkStore.received.size === this.chunkStore.total;

    if (!isComplete) {
      const missingChunks = Array.from({ length: this.chunkStore.total }, (_, index) => index).filter(
        (index) => !this.chunkStore.received.has(index),
      );
      console.error(`[PreviewManager] Missing chunks: ${missingChunks.join(", ")}`);
      return;
    }

    const previewData: PreviewData = {
      content: this.chunkStore.chunks.join(""),
      language,
      theme,
      metadata,
    };

    let adapter = PreviewRendererAdapterRegistry.instance.getAdapter(previewAdapterType);
    const finalPreviewerType = previewData.overridePreviewer ?? previewAdapterType;

    this.clearPreview();

    if (previewAdapterType === "preview.none") {
      this.hidePreviewPanel();
      this.chunkStore.reset();
      return;
    }

    this.showPreviewPanel();

    if (!adapter) {
      console.error(`[PreviewManager] No adapter found for finder type: ${previewAdapterType}`);
      return;
    }

    this.setAdapter(adapter);
    await this.adapter.render(this.previewElement, previewData);

    if (finalPreviewerType !== "preview.buffer") {
      requestAnimationFrame(() => {
        this.scrollToHighlighted();
      });
    }

    this.chunkStore.reset();
  }
}
