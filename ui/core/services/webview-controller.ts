import { OptionListMessage, ToWebviewKindMessage } from "@shared/extension-webview-protocol";
import { debounce } from "../../utils/debounce";
import { FuzzyFinderDataAdapterRegistry } from "../registry/finder-adapter.registry";
import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";
import { PreviewManager } from "./preview-manager";
import { ShikiManager } from "./shiki-manager";
import { VSCodeApiService } from "./vscode-api-service";

/**
 * Controller responsible for orchestrating all webview-side logic.
 */
export class WebviewController {
  /** Search input HTML element used for filtering options. */
  private searchElement: HTMLInputElement;

  constructor(
    private readonly previewManager: PreviewManager,
    private readonly optionListManager: OptionListManager,
    private readonly keyboardHandler: KeyboardHandler,
  ) {
    console.log("[WebviewController] Initializing controller");
    this.searchElement = document.getElementById("search") as HTMLInputElement;
    this.setupEventListeners();
    this.setupKeyboardHandlers();
  }

  async initialize() {
    const onDOMReady = () => {
      console.log("[WebviewController] DOM is ready!");
      this.focusSearchInput();
      VSCodeApiService.instance.onDOMReady();
      console.log("[WebviewController] Sent 'webviewDOMReady' message to extension");
    };

    if (document.readyState === "loading") {
      console.log("[WebviewController] DOM still loading, waiting for DOMContentLoaded...");
      window.addEventListener("DOMContentLoaded", onDOMReady);
    } else {
      console.log("[WebviewController] DOM already loaded, initializing immediately");
      onDOMReady();
    }

    window.addEventListener("message", async (event) => {
      await this.handleMessage(event.data as ToWebviewKindMessage);
    });

    window.addEventListener("focus", () => {
      this.focusSearchInput();
    });
  }

  private focusSearchInput(): void {
    requestAnimationFrame(() => {
      this.searchElement?.focus();
    });
  }

  /**
   * Handles a message received from the VS Code extension.
   *
   * @param msg - The message payload sent from the extension.
   */
  private async handleMessage(msg: ToWebviewKindMessage): Promise<void> {
    console.log(`[WebviewController] Handling message: ${msg}`);
    switch (msg.type) {
      case "resetWebview": {
        await this.handleResetWebview();
        break;
      }

      case "shikiInit": {
        await Promise.all(msg.data.languages.map((language) => ShikiManager.loadLanguageFromBundle(language)));
        await ShikiManager.loadThemeFromBundle(msg.data.theme);

        this.previewManager.setUserTheme(msg.data.theme);
        VSCodeApiService.instance.onShikiInit();
        break;
      }

      case "themeUpdate": {
        console.log("Theme updated on webview");
        await ShikiManager.loadThemeFromBundle(msg.data.theme);
        await this.previewManager.rerenderWithTheme(msg.data.theme);
        break;
      }

      case "optionList": {
        await this.handleOptionListMessage(msg);
        break;
      }

      case "previewUpdate": {
        console.log("[WebviewController] Processing previewUpdate message", msg.data);
        const { previewAdapterType, data } = msg;
        await this.previewManager.updatePreview(data, previewAdapterType);
        this.optionListManager.scrollToSelected();
        break;
      }
    }
  }

  /**
   * Clears the search input and the preview section.
   */
  private async handleResetWebview() {
    this.searchElement.value = "";
    this.previewManager.clearPreview();
  }

  /**
   * Processes a list of options received from the extension.
   *
   * @param msg - Message containing the finder type and option data.
   */
  private async handleOptionListMessage(msg: OptionListMessage) {
    const { fuzzyProviderType, data } = msg;

    const adapter = FuzzyFinderDataAdapterRegistry.instance.getAdapter(fuzzyProviderType);

    if (!adapter) {
      console.error(`No adapter found for finder type: ${fuzzyProviderType}`);
      console.log("Available adapters:", FuzzyFinderDataAdapterRegistry.instance.getRegisteredTypes());
      return;
    }

    this.optionListManager.setAdapter(adapter);

    const options = adapter.parseOptions(data);
    this.optionListManager.setOptions(options);

    this.focusSearchInput();
  }

  /**
   * Registers DOM events
   */
  private setupEventListeners(): void {
    const debouncedFilter = debounce((query: string) => {
      VSCodeApiService.instance.requestDynamicSearch(query);
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

  /**
   * Registers keyboard shortcuts for:
   */
  private setupKeyboardHandlers(): void {
    this.keyboardHandler.setMoveUpHandler(() => {
      this.optionListManager.moveSelection(1);
    });

    this.keyboardHandler.setMoveDownHandler(() => {
      this.optionListManager.moveSelection(-1);
    });

    this.keyboardHandler.setScrollUpHandler(() => {
      this.previewManager.scrollUp();
    });

    this.keyboardHandler.setScrollDownHandler(() => {
      this.previewManager.scrollDown();
    });

    this.keyboardHandler.setScrollRight(() => {
      this.previewManager.scrollRight();
    });

    this.keyboardHandler.setScrollLeft(() => {
      this.previewManager.scrollLeft();
    });

    this.keyboardHandler.setConfirmHandler(() => {
      this.confirmSelection();
    });

    this.keyboardHandler.setCloseHandler(() => {
      VSCodeApiService.instance.requestClosePanel();
    });
  }

  /**
   * Confirms the currently selected option and notifies the extension.
   */
  private confirmSelection(): void {
    const selectedValue = this.optionListManager.getSelectedValue();
    if (selectedValue) {
      VSCodeApiService.instance.onOptionSelected(selectedValue);
    }
  }
}
