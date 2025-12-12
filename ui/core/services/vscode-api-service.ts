import { FromWebviewKindMessage } from "../../../shared/extension-webview-protocol";

/**
 * Wrapper service around the VS Code Webview API.
 *
 * This class centralizes all communication sent **from the Webview to the Extension**,
 */
export class VSCodeApiService {
  private vscodeApi: ReturnType<typeof acquireVsCodeApi>;
  static service: VSCodeApiService | null = null;

  constructor() {
    this.vscodeApi = acquireVsCodeApi();
  }

  static get instance() {
    if (this.service) return this.service;

    this.service = new VSCodeApiService();
    return this.service;
  }

  /**
   * Sends a message to the VS Code extension.
   *
   * @param message - The message payload following the {@link FromWebviewKindMessage} contract.
   */
  postMessage(message: FromWebviewKindMessage): void {
    this.vscodeApi.postMessage(message);
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
  requestSelectionPreviewData(selection: string): void {
    this.postMessage({
      type: "previewRequest",
      data: selection,
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

  onShikiInit() {
    this.postMessage({
      type: "shikInitDone",
    });
  }
}
