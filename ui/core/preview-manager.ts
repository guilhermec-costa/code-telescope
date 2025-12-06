import { PreviewAdapter } from "../../shared/adapters-namespace";
import { PreviewData } from "../../shared/extension-webview-protocol";
import { CodeWithHighlightPreviewAdapter } from "./preview-adapters/code-with-highlight.adapter";
import { IPreviewAdapter } from "./preview-adapters/preview-adapter";
import { PreviewAdapterRegistry } from "./preview-adapters/preview-adapter-registry";
import { VSCodeApiService } from "./vscode-api-service";

export class PreviewManager {
  private lastPreviewedData: PreviewData = {
    content: "",
    language: "",
    metadata: {},
  };

  private previewElement: HTMLElement | null;
  private readonly vscodeService: VSCodeApiService;
  private readonly previewAdapterRegistry: PreviewAdapterRegistry;
  private adapter: IPreviewAdapter | null = null;

  constructor(vscodeService: VSCodeApiService) {
    console.log("[PreviewManager] Initializing");
    this.vscodeService = vscodeService;
    this.previewElement = document.getElementById("preview");
    this.previewAdapterRegistry = new PreviewAdapterRegistry();
  }

  setAdapter(adapter: IPreviewAdapter) {
    this.adapter = adapter;
  }

  async updatePreview(data: PreviewData, finderType: PreviewAdapter, theme: string): Promise<void> {
    if (!this.previewElement) {
      console.warn("[PreviewManager] Cannot update preview: adapter or previewElement missing");
      return;
    }

    const adapter = this.previewAdapterRegistry.getAdapter(finderType);

    if (!adapter) {
      console.error(`No adapter found for finder type: ${finderType}`);
      console.log("Available adapters:", this.previewAdapterRegistry.getRegisteredTypes());
      return;
    }

    console.log("[PreviewManager] Adapter found, rendering preview");
    this.setAdapter(adapter);

    // await this.adapter!.render(this.previewElement, data, theme);
    new CodeWithHighlightPreviewAdapter();
    this.scrollToTop();
    this.lastPreviewedData = data;
    console.log("[PreviewManager] Preview rendered");
  }

  async updateTheme(theme: string): Promise<void> {
    if (!this.adapter || !this.previewElement) return;
    await this.adapter.render(this.previewElement, this.lastPreviewedData, theme);
  }

  requestPreview(option: string): void {
    this.vscodeService.requestPreview(option);
  }

  scrollToTop() {
    if (!this.previewElement) return;
    this.previewElement.scrollTop = 0;
  }

  scrollUp(): void {
    if (!this.previewElement) return;
    const height = this.previewElement.clientHeight;
    this.previewElement.scrollTop -= height / 2;
  }

  scrollDown(): void {
    if (!this.previewElement) return;
    const height = this.previewElement.clientHeight;
    this.previewElement.scrollTop += height / 2;
  }

  scrollLeft(): void {
    if (!this.previewElement) return;
    const width = this.previewElement.clientWidth;
    this.previewElement.scrollLeft -= width / 2;
  }

  scrollRight(): void {
    if (!this.previewElement) return;
    const width = this.previewElement.clientWidth;
    this.previewElement.scrollLeft += width / 2;
  }
}
