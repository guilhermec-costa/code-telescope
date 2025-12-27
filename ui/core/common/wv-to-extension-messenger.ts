import { FromWebviewKindMessage } from "../../../shared/extension-webview-protocol";
import { VSCodeApi } from "./code/code-api";

/**
 * Messaging wrapper for the VS Code Webview API.
 *
 * This class is responsible for all outbound communication from the Webview to the Extension
 */
export class WebviewToExtensionMessenger {
  private static _instance: WebviewToExtensionMessenger | null = null;

  static get instance() {
    if (this._instance) return this._instance;

    this._instance = new WebviewToExtensionMessenger();
    return this._instance;
  }

  /**
   * Sends a message to the VS Code extension.
   *
   * @param message - The message payload following the {@link FromWebviewKindMessage} contract.
   */
  postMessage(message: FromWebviewKindMessage): void {
    VSCodeApi.postMessage(message);
  }

  /**
   * Notifies the extension that the Webview DOM has finished loading.
   */
  onDOMReady(): void {
    this.postMessage({ type: "webviewDOMReady" });
  }

  /**
   * Notifies the extension that the user has confirmed a selected option.
   *
   * @param option - The selected value to send back to the extension.
   */
  onOptionSelected(option: string): void {
    this.postMessage({ type: "optionSelected", data: option });
  }

  /**
   * Requests the extension to close the webview panel.
   */
  requestClosePanel(): void {
    this.postMessage({ type: "closePanel" });
  }

  /**
   * Requests preview data for a given selected item.
   *
   * @param selection - The identifier of the item the user highlighted.
   */
  requestSelectionPreviewData(selectedId: string): void {
    this.postMessage({
      type: "previewRequest",
      data: {
        selectedId,
      },
    });
  }

  /**
   * Sends a dynamic search request to the extension.
   * Triggered whenever the user types into the search input.
   *
   * @param query - The text typed by the user.
   */
  requestDynamicSearch(query: string): void {
    this.postMessage({
      type: "dynamicSearch",
      query,
    });
  }

  requestHighlightCache(content: string, path: string, highlightedLine?: number) {
    this.postMessage({
      type: "highlightCache",
      data: {
        content,
        path,
        highlightedLine,
      },
    });
  }

  onShikiInit() {
    this.postMessage({
      type: "shikInitDone",
    });
  }
}
