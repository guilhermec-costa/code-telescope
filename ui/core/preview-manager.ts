import { PreviewRendererType } from "../../shared/adapters-namespace";
import { PreviewData } from "../../shared/extension-webview-protocol";
import { IPreviewAdapter } from "./preview-adapters/preview-adapter";
import { PreviewAdapterRegistry } from "./preview-adapters/preview-adapter-registry";
import { VSCodeApiService } from "./vscode-api-service";

export class PreviewManager {
  private lastPreviewedData: PreviewData = {
    content: "",
    language: "",
    metadata: {},
  };

  private previewElement: HTMLElement;
  private readonly vscodeService: VSCodeApiService;
  private readonly previewAdapterRegistry: PreviewAdapterRegistry;
  private adapter: IPreviewAdapter | null = null;

  constructor(vscodeService: VSCodeApiService) {
    console.log("[PreviewManager] Initializing");
    this.vscodeService = vscodeService;
    this.previewElement = document.getElementById("preview")!;
    this.previewAdapterRegistry = new PreviewAdapterRegistry();
  }

  setAdapter(adapter: IPreviewAdapter) {
    this.adapter = adapter;
  }

  async updatePreview(data: PreviewData, finderType: PreviewRendererType, theme: string): Promise<void> {
    const adapter = this.previewAdapterRegistry.getAdapter(finderType);

    if (!adapter) {
      console.error(`No adapter found for finder type: ${finderType}`);
      console.log("Available adapters:", this.previewAdapterRegistry.getRegisteredTypes());
      return;
    }

    console.log("[PreviewManager] Adapter found, rendering preview");
    this.setAdapter(adapter);

    await this.adapter!.render(this.previewElement, data, theme);
    this.scrollToTop();
    this.lastPreviewedData = data;
    console.log("[PreviewManager] Preview rendered");
  }

  clearPreview() {
    this.previewElement.innerHTML = "";
  }

  renderNoPreviewData() {
    if (!this.adapter) return;
    if (this.adapter.renderNoPreviewData) {
      this.adapter.renderNoPreviewData(this.previewElement);
      return;
    }
    this.previewElement.innerHTML = "No data to preview";
  }

  async updateTheme(theme: string): Promise<void> {
    if (!this.adapter) return;
    await this.adapter.render(this.previewElement, this.lastPreviewedData, theme);
  }

  requestPreview(option: string): void {
    this.vscodeService.requestPreview(option);
  }

  scrollToTop() {
    this.previewElement.scrollTop = 0;
  }

  scrollUp(): void {
    const height = this.previewElement.clientHeight;
    this.previewElement.scrollTop -= height / 2;
  }

  scrollDown(): void {
    const height = this.previewElement.clientHeight;
    this.previewElement.scrollTop += height / 2;
  }

  scrollLeft(): void {
    const width = this.previewElement.clientWidth;
    this.previewElement.scrollLeft -= width / 2;
  }

  scrollRight(): void {
    const width = this.previewElement.clientWidth;
    this.previewElement.scrollLeft += width / 2;
  }
}
