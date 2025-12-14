import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { WebviewToExtensionMessenger } from "../common/wv-to-extension-messenger";
import { PreviewRendererAdapterRegistry } from "../registry/preview-adapter.registry";

export class PreviewManager {
  private previewElement: HTMLElement;
  private userTheme: string = "dark-plus";
  private adapter: IPreviewRendererAdapter | null = null;

  private lastPreviewedData: PreviewData = {
    content: "",
    language: "",
    metadata: {},
  };

  constructor() {
    console.log("[PreviewManager] Initializing");
    this.previewElement = document.getElementById("preview")!;
  }

  setAdapter(adapter: IPreviewRendererAdapter) {
    this.adapter = adapter;
  }

  async updatePreview(data: PreviewData, finderType: PreviewRendererType): Promise<void> {
    const adapter = PreviewRendererAdapterRegistry.instance.getAdapter(finderType);

    if (!adapter) {
      console.error(`No adapter found for finder type: ${finderType}`);
      console.log("Available adapters:", PreviewRendererAdapterRegistry.instance.getRegisteredTypes());
      return;
    }

    console.log("[PreviewManager] Adapter found, rendering preview");
    this.setAdapter(adapter);

    this.clearPreview();
    await this.adapter.render(this.previewElement, data, this.userTheme);
    this.scrollToHighlighted();
    this.lastPreviewedData = data;
    console.log("[PreviewManager] Preview rendered");
  }

  clearPreview() {
    this.previewElement.innerHTML = "";
  }

  async renderNoPreviewData() {
    if (!this.adapter) return;

    if (this.adapter.renderNoPreviewData) {
      await this.adapter.renderNoPreviewData(this.previewElement);
      return;
    }
    this.previewElement.innerHTML = "No data to preview";
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

  scrollToHighlighted() {
    const highlightedLine = this.previewElement.querySelector(".line.highlighted");
    if (!highlightedLine) {
      this.scrollToTop();
      return;
    }
    highlightedLine.scrollIntoView();
    this.previewElement.scrollTop -= this.getPreviewHeight() / 2;
  }

  private getPreviewHeight() {
    return this.previewElement.clientHeight;
  }

  private getPreviewWidth() {
    return this.previewElement.clientWidth;
  }

  scrollUp(): void {
    this.previewElement.scrollTop -= this.getPreviewHeight() / 2;
  }

  scrollDown(): void {
    this.previewElement.scrollTop += this.getPreviewHeight() / 2;
  }

  scrollLeft(): void {
    this.previewElement.scrollLeft -= this.getPreviewWidth() / 2;
  }

  scrollRight(): void {
    this.previewElement.scrollLeft += this.getPreviewWidth() / 2;
  }
}
