import { OptionListMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { debounce } from "../../utils/debounce";
import { FuzzyFinderDataAdapterRegistry } from "../registry/finder-adapter.registry";
import { PreviewManager } from "../render/preview-manager";
import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";
import { WebviewToExtensionMessenger } from "./wv-to-extension-messenger";

/**
 * Controller responsible for orchestrating all webview-side logic.
 */
export class WebviewController {
  /** Search input HTML element used for filtering options. */
  private searchElement: HTMLInputElement;
  private pendingHeavyFiles = new Set<string>();

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
        WebviewToExtensionMessenger.instance.onDOMReady();
        break;
      }

      case "highlighterInit": {
        this.previewManager.setUserTheme(msg.data.theme);
        WebviewToExtensionMessenger.instance.onHighlighterDone();
        break;
      }

      case "optionList": {
        this.handleOptionListMessage(msg);
        break;
      }

      case "removeHeavyOptions": {
        for (const p of msg.data) {
          this.pendingHeavyFiles.add(p);
        }

        this.optionListManager.removeHeavyFiles(Array.from(this.pendingHeavyFiles));
        this.pendingHeavyFiles.clear();
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
  }

  /**
   * Processes a list of options received from the extension.
   */
  private handleOptionListMessage(msg: OptionListMessage) {
    const { fuzzyProviderType, data, isChunk } = msg;
    const adapter = FuzzyFinderDataAdapterRegistry.instance.getAdapter(fuzzyProviderType);

    if (!adapter) return;

    this.optionListManager.setAdapter(adapter);
    const options = adapter.parseOptions(data);

    if (isChunk) {
      this.optionListManager.appendOptions(options);
    } else {
      if (fuzzyProviderType !== "workspace.text") {
        this.searchElement.value = "";
      }
      this.optionListManager.setOptions(options);
    }

    if (this.searchElement.value) {
      this.optionListManager.filter(this.searchElement.value);
    }
  }

  /**
   * Registers DOM events
   */
  private setupEventListeners(): void {
    const debouncedFilter = debounce((query: string) => {
      WebviewToExtensionMessenger.instance.requestDynamicSearch(query);
      this.optionListManager.filter(query);
    }, this.optionListManager.getAdapterSearchDebounceTime());

    this.searchElement.addEventListener("input", async () => {
      debouncedFilter(this.searchElement.value);
      this.optionListManager.resetIfNeeded();
    });
  }

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
