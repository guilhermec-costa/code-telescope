import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewManagerConfig } from "../../../shared/exchange/extension-config";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { WebviewToExtensionMessenger } from "../common/wv-to-extension-messenger";
import { PreviewRendererAdapterRegistry } from "../registry/preview-adapter.registry";

/**
 * Manages the preview panel lifecycle inside the webview.
 */
export class PreviewManager {
  private previewElement: HTMLElement;
  private userTheme: string;
  private adapter: IPreviewRendererAdapter | null = null;
  private cfg: PreviewManagerConfig = __PREVIEW_CFG__;

  private lastPreviewedData: PreviewData = {
    content: "",
    language: "",
    metadata: {},
  };

  constructor() {
    console.log("[PreviewManager] Initializing");
    this.previewElement = document.getElementById("preview")!;
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

    if (!adapter) {
      console.error(`No adapter found for finder type: ${finderType}`);
      console.log("Available adapters:", PreviewRendererAdapterRegistry.instance.getRegisteredTypes());
      return;
    }

    this.setAdapter(adapter);

    this.clearPreview();
    await this.adapter.render(this.previewElement, data, this.userTheme);

    // Scroll after DOM is painted
    requestAnimationFrame(() => {
      this.scrollToHighlighted();
    });
    this.lastPreviewedData = data;
  }

  clearPreview() {
    this.previewElement.innerHTML = "";
  }

  async setUserTheme(theme: string) {
    this.userTheme = theme;
  }

  async rerenderWithTheme(theme: string): Promise<void> {
    this.userTheme = theme;
    if (!this.adapter) return;
    console.log(`[PreviewManager] Updating user theme to ${theme}`);
    await this.adapter.render(this.previewElement, this.lastPreviewedData, this.userTheme);
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
}
