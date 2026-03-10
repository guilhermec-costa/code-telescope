import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { OptionListMessage, ToWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { MessageBridge } from "../message-bridge";
import { FuzzyFinderDataAdapterRegistry } from "../registry/finder-adapter.registry";
import { PreviewManager } from "../render/preview-manager";
import { VimInputHandler } from "../vim";
import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";
import { WebviewToExtensionMessenger } from "./wv-to-extension-messenger";

/**
 * Controller responsible for orchestrating all webview-side logic.
 */
export class WebviewController {
  /** Search input HTML element used for filtering options. */
  private searchElement: HTMLInputElement;
  private activeProvider: FuzzyProviderType | undefined;
  private previewQueue: Promise<void> = Promise.resolve();
  private lastSearchQuery: string | undefined;
  private currentRequestId: string | undefined;

  constructor(private readonly keyboardHandler: KeyboardHandler) {
    console.log("[WebviewController] Initializing controller");
    this.searchElement = document.getElementById("search") as HTMLInputElement;
    new VimInputHandler(this.searchElement);

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

      case "grammarChunk": {
        MessageBridge.handleGrammarChunk(msg);
        break;
      }

      case "grammarComplete": {
        MessageBridge.handleGrammarComplete(msg);
        break;
      }

      case "optionList": {
        this.handleOptionListMessage(msg);
        break;
      }

      case "fullPreviewUpdate": {
        this.previewQueue = this.previewQueue.then(async () => {
          try {
            const { previewAdapterType, data } = msg;
            await PreviewManager.instance.updatePreview(data, previewAdapterType);
          } catch (error) {
            console.error("[WebviewController] Error processing preview chunk:", error);
          }
        });
        break;
      }

      case "previewChunk": {
        this.previewQueue = this.previewQueue.then(async () => {
          try {
            await PreviewManager.instance.handlePreviewChunk(msg);
          } catch (error) {
            console.error("[WebviewController] Error processing preview chunk:", error);
          }
        });
        break;
      }

      case "previewComplete": {
        this.previewQueue = this.previewQueue.then(async () => {
          try {
            await PreviewManager.instance.handlePreviewComplete(msg);
          } catch (error) {
            console.error("[WebviewController] Error processing preview complete:", error);
          }
        });
        break;
      }
    }
  }

  /**
   * Processes a list of options received from the extension.
   */
  private handleOptionListMessage(msg: OptionListMessage) {
    if (msg.requestId && this.currentRequestId && msg.requestId !== this.currentRequestId) {
      return;
    }

    const { fuzzyProviderType, dataAdapterType, data, totalLimit, query } = msg;
    const adapter = FuzzyFinderDataAdapterRegistry.instance.getAdapter(dataAdapterType);

    if (!adapter) return;

    this.activeProvider = fuzzyProviderType;
    OptionListManager.instance.setAdapter(adapter);
    const options = adapter.parseOptions(data);
    const isNewSearch = query !== this.lastSearchQuery;
    if (isNewSearch) {
      this.lastSearchQuery = query;
      OptionListManager.instance.clearOptions();
    }
    OptionListManager.instance.appendChunk(options, totalLimit);

    if (this.searchElement.value) {
      OptionListManager.instance.filter(this.searchElement.value);
    }
  }

  /**
   * Registers DOM events
   */
  private setupEventListeners(): void {
    this.searchElement.addEventListener("input", async () => {
      const query = this.searchElement.value;
      if (query) {
        WebviewToExtensionMessenger.instance.requestDynamicSearch(query);
        this.currentRequestId = WebviewToExtensionMessenger.instance.lastRequestId;
      }
      OptionListManager.instance.filter(query);
      OptionListManager.instance.resetIfNeeded();
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
