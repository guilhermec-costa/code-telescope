import { codeToHtml } from "shiki";
import { VSCodeApiService } from "./vscode-api-service";

interface LastPreviewedData {
  option: string | null;
  content: string | null;
  language: string | null;
}

export class PreviewManager {
  private lastPreviewedData: LastPreviewedData = {
    option: null,
    content: null,
    language: null,
  };

  private previewElement: HTMLElement | null;
  private vscodeService: VSCodeApiService;

  constructor(vscodeService: VSCodeApiService) {
    this.vscodeService = vscodeService;
    this.previewElement = document.getElementById("preview");
  }

  async updatePreview(content: string, language: string = "text", theme: string = "Default Dark+"): Promise<void> {
    if (!this.previewElement) return;

    this.lastPreviewedData.content = content;
    this.lastPreviewedData.language = language;

    const html = await codeToHtml(content, {
      lang: language,
      theme: theme,
    });
    this.previewElement.innerHTML = html;
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
    if (this.lastPreviewedData.option !== option) {
      this.lastPreviewedData.option = option;
      this.vscodeService.requestPreview(option);
    }
  }

  getLastPreviewedOption(): string | null {
    return this.lastPreviewedData.option;
  }
}
