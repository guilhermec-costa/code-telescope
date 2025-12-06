import { PreviewRendererType } from "../../shared/adapters-namespace";
import { PreviewData } from "../../shared/extension-webview-protocol";
import { IPreviewAdapter } from "./abstractions/preview-adapter";
import { PreviewAdapterRegistry } from "./registries/preview-adapter-registry";
import { VSCodeApiService } from "./vscode-api-service";

export class PreviewManager {
  private previewElement: HTMLElement;
  private currentTheme: string = "dark-plus";
  private adapter: IPreviewAdapter | null = null;

  private lastPreviewedData: PreviewData = {
    content: "",
    language: "",
    metadata: {},
  };

  constructor(
    private readonly vscodeService: VSCodeApiService,
    private readonly previewAdapterRegistry: PreviewAdapterRegistry,
  ) {
    console.log("[PreviewManager] Initializing");
    this.previewElement = document.getElementById("preview")!;
  }

  setAdapter(adapter: IPreviewAdapter) {
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

    await this.adapter!.render(this.previewElement, data, this.currentTheme);
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
    this.currentTheme = theme;
    if (!this.adapter) return;
    console.log(`[PreviewManager] Updating user theme to ${theme}`);
    this.adapter.render(this.previewElement, this.lastPreviewedData, this.currentTheme);
  }

  requestPreview(selection: string): void {
    this.vscodeService.requestSelectionPreviewData(selection);
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
