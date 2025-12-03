import { codeToHtml } from "shiki";
import { FuzzyAdapter } from "../../shared/adapters-namespace";
import { PreviewData } from "../../shared/extension-webview-protocol";
import { IPreviewAdapter } from "./preview/preview-adapter";
import { PreviewAdapterRegistry } from "./preview/preview-adapter-registry";
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

  async updatePreview(data: PreviewData, finderType: FuzzyAdapter, theme: string): Promise<void> {
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
    await this.adapter!.render(this.previewElement, data, theme);
    console.log("[PreviewManager] Preview rendered");
  }

  async updateTheme(theme: string): Promise<void> {
    if (!this.previewElement || !this.lastPreviewedData.content || !this.lastPreviewedData.language) {
      return;
    }

    const html = await codeToHtml(this.lastPreviewedData.content, {
      lang: this.lastPreviewedData.language,
      theme: theme,
    });
    this.previewElement.innerHTML = html;
  }

  requestPreviewIfNeeded(option: string): void {
    this.vscodeService.requestPreview(option);
  }
}
