import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapterRegistry } from "../registry/preview-adapter.registry";
import { VSCodeApiService } from "./vscode-api-service";

export class PreviewManager {
  private previewElement: HTMLElement;
  private currentTheme: string = "dark-plus";
  private adapter: IPreviewRendererAdapter | null = null;

  private lastPreviewedData: PreviewData = {
    content: "",
    language: "",
    metadata: {},
  };

  constructor(private readonly previewAdapterRegistry: PreviewRendererAdapterRegistry) {
    console.log("[PreviewManager] Initializing");
    this.previewElement = document.getElementById("preview")!;
  }

  setAdapter(adapter: IPreviewRendererAdapter) {
    this.adapter = adapter;
  }

  async updatePreview(data: PreviewData, finderType: PreviewRendererType): Promise<void> {
    const adapter = this.previewAdapterRegistry.getAdapter(finderType);

    if (!adapter) {
      console.error(`No adapter found for finder type: ${finderType}`);
      console.log("Available adapters:", this.previewAdapterRegistry.getRegisteredTypes());
      return;
    }

    console.log("[PreviewManager] Adapter found, rendering preview");
    this.setAdapter(adapter);

    this.clearPreview();
    await this.adapter.render(this.previewElement, data, this.currentTheme);
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

  async updateTheme(theme: string): Promise<void> {
    this.currentTheme = theme;
    if (!this.adapter) return;
    console.log(`[PreviewManager] Updating user theme to ${theme}`);
    await this.adapter.render(this.previewElement, this.lastPreviewedData, this.currentTheme);
  }

  requestPreview(selection: string): void {
    VSCodeApiService.instance.requestSelectionPreviewData(selection);
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
