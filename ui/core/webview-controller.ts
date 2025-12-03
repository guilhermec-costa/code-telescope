import { OptionListMessage, type WebviewMessage } from "@shared/extension-webview-protocol";
import { debounce } from "../utils/debounce";
import { FinderAdapterRegistry } from "./adapters/finder-adapter-registry";
import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";
import { PreviewUpdateMessage } from "./preview/preview-adapter";
import { PreviewManager } from "./preview-manager";
import { VSCodeApiService } from "./vscode-api-service";

export class WebviewController {
  private vscodeService: VSCodeApiService;
  private previewManager: PreviewManager;
  private optionListManager: OptionListManager;
  private keyboardHandler: KeyboardHandler;
  private searchElement: HTMLInputElement;
  private adapterRegistry: FinderAdapterRegistry;

  constructor() {
    console.log("[WebviewController] Initializing controller");
    this.vscodeService = new VSCodeApiService();
    this.previewManager = new PreviewManager(this.vscodeService);
    this.optionListManager = new OptionListManager(this.previewManager);
    this.keyboardHandler = new KeyboardHandler();
    this.searchElement = document.getElementById("search") as HTMLInputElement;
    this.adapterRegistry = new FinderAdapterRegistry();

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
    console.log(`[WebviewController] Handling message: ${msg}`);
    if (msg.type === "optionList" && "finderType" in msg) {
      await this.handleOptionListMessage(msg);
      return;
    }

    if (msg.type === "previewUpdate" && "finderType" in msg) {
      console.log("[WebviewController] Processing previewUpdate message", msg.data);
      const { finderType, data, theme } = msg as PreviewUpdateMessage;
      await this.previewManager.updatePreview(data, finderType, theme);
      return;
    }

    switch (msg.type) {
      case "themeUpdate":
        console.log("Theme updated on webview");
        await this.previewManager.updateTheme(msg.data.theme);
        break;
    }
  }

  private async handleOptionListMessage(msg: OptionListMessage) {
    const { finderType, data } = msg;

    const adapter = this.adapterRegistry.getAdapter(finderType);

    if (!adapter) {
      console.error(`No adapter found for finder type: ${finderType}`);
      console.log("Available adapters:", this.adapterRegistry.getRegisteredTypes());
      return;
    }

    this.optionListManager.setAdapter(adapter);

    const options = adapter.parseOptions(data);
    this.optionListManager.setOptions(options);

    this.focusSearchInput();
  }

  private setupEventListeners(): void {
    const debouncedFilter = debounce((query: string) => {
      this.optionListManager.filter(query);
    }, 50);

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
    const selectedValue = this.optionListManager.getSelectedValue();
    if (selectedValue) {
      this.vscodeService.selectOption(selectedValue);
    }
  }
}
