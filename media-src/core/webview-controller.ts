import { type WebviewMessage } from "@shared/extension-webview-protocol";
import { debounce } from "../utils/debounce";
import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";
import { PreviewManager } from "./preview-manager";
import { VSCodeApiService } from "./vscode-api-service";

export class WebviewController {
  private vscodeService: VSCodeApiService;
  private previewManager: PreviewManager;
  private optionListManager: OptionListManager;
  private keyboardHandler: KeyboardHandler;
  private searchElement: HTMLInputElement;

  constructor() {
    this.vscodeService = new VSCodeApiService();
    this.previewManager = new PreviewManager(this.vscodeService);
    this.optionListManager = new OptionListManager(this.previewManager);
    this.keyboardHandler = new KeyboardHandler();
    this.searchElement = document.getElementById("search") as HTMLInputElement;

    this.setupEventListeners();
    this.setupKeyboardHandlers();
  }

  initialize(): void {
    window.addEventListener("DOMContentLoaded", () => {
      this.focusSearchInput();
      this.vscodeService.notifyReady();
    });

    window.addEventListener("message", async (event) => {
      await this.handleMessage(event.data as WebviewMessage);
    });

    window.addEventListener("focus", () => {
      this.focusSearchInput();
    });

    this.focusSearchInput();
  }

  private focusSearchInput(): void {
    this.searchElement?.focus();

    setTimeout(() => {
      this.searchElement?.focus();
    }, 100);

    requestAnimationFrame(() => {
      this.searchElement?.focus();
    });
  }

  private async handleMessage(msg: WebviewMessage): Promise<void> {
    switch (msg.type) {
      case "optionList":
        this.optionListManager.setOptions(msg.data);
        this.focusSearchInput();
        break;

      case "previewUpdate":
        const { content, language, theme } = msg.data;
        await this.previewManager.updatePreview(content, language, theme);
        break;

      case "themeUpdate":
        console.log("Theme updated on webview");
        await this.previewManager.updateTheme(msg.data.theme);
        break;
    }
  }

  private setupEventListeners(): void {
    const debouncedFilter = debounce((query: string) => {
      this.optionListManager.filter(query);
    }, 150);

    this.searchElement.addEventListener("input", () => {
      const query = this.searchElement.value;
      debouncedFilter(query);
    });

    this.optionListManager.onSelectionConfirmed = () => {
      this.confirmSelection();
    };
  }

  private setupKeyboardHandlers(): void {
    this.keyboardHandler.setMoveUpHandler(() => {
      this.optionListManager.moveSelection(-1);
    });

    this.keyboardHandler.setMoveDownHandler(() => {
      this.optionListManager.moveSelection(1);
    });

    this.keyboardHandler.setConfirmHandler(() => {
      this.confirmSelection();
    });

    this.keyboardHandler.setCloseHandler(() => {
      this.vscodeService.closePanel();
    });
  }

  private confirmSelection(): void {
    const selectedOption = this.optionListManager.getSelectedOption();
    if (selectedOption) {
      this.vscodeService.selectOption(selectedOption);
    }
  }
}
