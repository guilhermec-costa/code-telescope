import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { OptionListMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { debounce } from "../../utils/debounce";
import { MessageBridge } from "../message-bridge";
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
  private activeProvider: FuzzyProviderType | undefined;

  constructor(private readonly keyboardHandler: KeyboardHandler) {
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
    console.log(`[WebviewController] ${new Date().toISOString()} Handling message: ${msg}`);

    switch (msg.type) {
      case "promiseBridgeResponse": {
        MessageBridge.handleResponse(msg);
        break;
      }
      case "resetWebview": {
        this.handleResetWebview();
        if (this.activeProvider !== msg.currentProvider) {
          this.searchElement.value = "";
        }
        WebviewToExtensionMessenger.instance.onDOMReady();
        break;
      }

      case "highlighterInit": {
        PreviewManager.instance.setUserTheme(msg.data.theme);
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

        OptionListManager.instance.removeHeavyFiles(Array.from(this.pendingHeavyFiles));
        this.pendingHeavyFiles.clear();
        break;
      }

      case "previewUpdate": {
        console.log("[WebviewController] Processing previewUpdate message", msg.data);
        const { previewAdapterType, data } = msg;
        await PreviewManager.instance.updatePreview(data, previewAdapterType);
        break;
      }
    }
  }

  /**
   * Clears the search input and the preview section.
   */
  private handleResetWebview() {
    PreviewManager.instance.clearPreview();
    OptionListManager.instance.clearOptions();
  }

  /**
   * Processes a list of options received from the extension.
   */
  private handleOptionListMessage(msg: OptionListMessage) {
    const { fuzzyProviderType, data, isChunk } = msg;
    const adapter = FuzzyFinderDataAdapterRegistry.instance.getAdapter(fuzzyProviderType);

    if (!adapter) return;

    this.activeProvider = fuzzyProviderType;
    OptionListManager.instance.setAdapter(adapter);
    const options = adapter.parseOptions(data);

    if (isChunk) {
      OptionListManager.instance.appendOptions(options);
    } else {
      OptionListManager.instance.setOptions(options);
    }

    if (this.searchElement.value) {
      OptionListManager.instance.filter(this.searchElement.value);
    }
  }

  /**
   * Registers DOM events
   */
  private setupEventListeners(): void {
    const debouncedFilter = debounce((query: string) => {
      if (query) {
        WebviewToExtensionMessenger.instance.requestDynamicSearch(query);
      }
      OptionListManager.instance.filter(query);
      OptionListManager.instance.resetIfNeeded();
    }, 20);

    this.searchElement.addEventListener("input", async () => {
      debouncedFilter(this.searchElement.value);
    });
  }

  private setupKeyboardHandlers(): void {
    this.keyboardHandler.setMoveUpHandler(OptionListManager.instance.moveSelectionUp.bind(OptionListManager.instance));
    this.keyboardHandler.setMoveDownHandler(
      OptionListManager.instance.moveSelectionDown.bind(OptionListManager.instance),
    );
    this.keyboardHandler.setScrollUpHandler(PreviewManager.instance.scrollUp.bind(PreviewManager.instance));
    this.keyboardHandler.setScrollDownHandler(PreviewManager.instance.scrollDown.bind(PreviewManager.instance));
    this.keyboardHandler.setScrollRight(PreviewManager.instance.scrollRight.bind(PreviewManager.instance));
    this.keyboardHandler.setScrollLeft(PreviewManager.instance.scrollLeft.bind(PreviewManager.instance));
    this.keyboardHandler.setConfirmHandler(this.confirmSelection.bind(this));
    this.keyboardHandler.setCloseHandler(
      WebviewToExtensionMessenger.instance.requestClosePanel.bind(WebviewToExtensionMessenger.instance),
    );
    this.keyboardHandler.setPromptDeleteHandler(() => {
      const input = this.searchElement;
      input.value = input.value.slice(0, -1);

      // propagate the changes, so current filter reacts
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  /**
   * Confirms the currently selected option and notifies the extension.
   */
  private confirmSelection(): void {
    const selectedValue = OptionListManager.instance.getSelectedValue();
    if (selectedValue) {
      WebviewToExtensionMessenger.instance.onOptionSelected(selectedValue);
    }
  }
}
