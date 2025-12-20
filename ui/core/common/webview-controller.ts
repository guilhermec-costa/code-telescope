import { OptionListMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { debounce } from "../../utils/debounce";
import { FuzzyFinderDataAdapterRegistry } from "../registry/finder-adapter.registry";
import { PreviewManager } from "../render/preview-manager";
import { ShikiManager } from "../render/shiki-manager";
import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";
import { WebviewToExtensionMessenger } from "./wv-to-extension-messenger";

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
      WebviewToExtensionMessenger.instance.onDOMReady();
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
      await this.handleMessage(event.data);
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
   * Handles a message received from the extension.
   *
   * @param msg - The message payload sent from the extension.
   */
  private async handleMessage(msg: ToWebviewKindMessage): Promise<void> {
    console.log(`[WebviewController] Handling message: ${msg}`);
    switch (msg.type) {
      case "resetWebview": {
        this.handleResetWebview();
        break;
      }

      case "shikiInit": {
        const langsPromises = msg.data.languages.map((language) => ShikiManager.loadLanguageFromBundle(language));
        await Promise.all([...langsPromises, ShikiManager.loadThemeFromBundle(msg.data.theme)]);

        this.previewManager.setUserTheme(msg.data.theme);
        WebviewToExtensionMessenger.instance.onShikiInit();
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
        break;
      }
    }
  }

  /**
   * Clears the search input and the preview section.
   */
  private handleResetWebview() {
    this.previewManager.clearPreview();
    this.optionListManager.clearOptions();
    this.searchElement.value = "";
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
      WebviewToExtensionMessenger.instance.requestDynamicSearch(query);
      this.optionListManager.filter(query);
    }, 300);

    this.searchElement.addEventListener("input", async () => {
      const query = this.searchElement.value;
      debouncedFilter(query);
      this.optionListManager.resetIfNeeded();
    });
  }

  /**
   * Registers keyboard shortcuts for:
   */
  private setupKeyboardHandlers(): void {
    this.keyboardHandler.setMoveUpHandler(this.optionListManager.moveSelectionUp.bind(this.optionListManager));
    this.keyboardHandler.setMoveDownHandler(this.optionListManager.moveSelectionDown.bind(this.optionListManager));
    this.keyboardHandler.setScrollUpHandler(this.previewManager.scrollUp.bind(this.previewManager));
    this.keyboardHandler.setScrollDownHandler(this.previewManager.scrollDown.bind(this.previewManager));
    this.keyboardHandler.setScrollRight(this.previewManager.scrollRight.bind(this.previewManager));
    this.keyboardHandler.setScrollLeft(this.previewManager.scrollLeft.bind(this.previewManager));
    this.keyboardHandler.setConfirmHandler(this.confirmSelection.bind(this));
    this.keyboardHandler.setCloseHandler(
      WebviewToExtensionMessenger.instance.requestClosePanel.bind(WebviewToExtensionMessenger.instance),
    );
  }

  /**
   * Confirms the currently selected option and notifies the extension.
   */
  private confirmSelection(): void {
    const selectedValue = this.optionListManager.getSelectedValue();
    if (selectedValue) {
      WebviewToExtensionMessenger.instance.onOptionSelected(selectedValue);
    }
  }
}
