import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewManagerConfig } from "../../../shared/exchange/extension-config";
import { PreviewChunkMessage, PreviewCompleteMessage, PreviewData } from "../../../shared/extension-webview-protocol";
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

  private lastPreviewedData: PreviewData = {
    content: "",
    language: "",
    metadata: {},
  };

  private chunkStore = {
    chunks: [],
    total: 0,
    reset() {
      this.chunks = [];
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

  async updatePreview(data: PreviewData, finderType: PreviewRendererType): Promise<void> {
    let adapter = data.overridePreviewer
      ? PreviewRendererAdapterRegistry.instance.getAdapter(data.overridePreviewer)
      : PreviewRendererAdapterRegistry.instance.getAdapter(finderType);

    this.clearPreview();
    if (!adapter) {
      console.error(`No adapter found for finder type: ${finderType}`);
      console.log("Available adapters:", PreviewRendererAdapterRegistry.instance.getRegisteredTypes());
      return;
    }

    this.setAdapter(adapter);

    await this.adapter.render(this.previewElement, data);

    // Scroll after DOM is painted
    requestAnimationFrame(() => {
      this.scrollToHighlighted();
    });
    this.lastPreviewedData = data;
  }

  clearPreview() {
    this.lastPreviewedData = { content: "", language: "", metadata: {} };
    this.previewElement.innerHTML = "";
  }

  requestPreview(selection: string): void {
    WebviewToExtensionMessenger.instance.requestSelectionPreviewData(selection);
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
    highlightedLine.scrollIntoView({ behavior: this.cfg.scrollBehavior, block: "center" });
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

  async handlePreviewChunk({ chunkIndex, totalChunks, content }: PreviewChunkMessage): Promise<void> {
    this.chunkStore.chunks[chunkIndex] = content;
    this.chunkStore.total = totalChunks;
  }

  async handlePreviewComplete({
    previewAdapterType,
    language,
    theme,
    metadata,
  }: PreviewCompleteMessage): Promise<void> {
    const isComplete = this.chunkStore.chunks.every((chunk) => chunk !== undefined);

    if (!isComplete) {
      const missingChunks = this.chunkStore.chunks
        .map((chunk, index) => (chunk === undefined ? index : -1))
        .filter((index) => index !== -1);
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

    this.clearPreview();
    if (!adapter) {
      console.error(`[PreviewManager] No adapter found for finder type: ${previewAdapterType}`);
      return;
    }

    this.setAdapter(adapter);
    await this.adapter.render(this.previewElement, previewData);

    requestAnimationFrame(() => {
      this.scrollToHighlighted();
    });

    this.lastPreviewedData = previewData;
    this.chunkStore.chunks = [];
    this.chunkStore.reset();
  }
}
