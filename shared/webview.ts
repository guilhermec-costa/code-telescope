/**
 * VS Code injects this global function into every webview environment.
 *
 * It provides an API that enables bidirectional communication between the
 * webview and the extension host
 */
declare function acquireVsCodeApi(): {
  /**
   * Sends a message from the webview to the extension host.
   * The extension must listen for the `onDidReceiveMessage` event to handle it.
   */
  postMessage(message: WebviewMessage): void;

  /**
   * Retrieves the previously saved state for this webview.
   */
  getState(): any;

  /**
   * Saves a state object that is persisted by VS Code and restored on reload.
   */
  setState(state: any): void;
};

/**
 * Enumeration of all event types exchanged between the webview UI
 * and the extension backend.
 */
type FuzzyPanelEvents = "ready" | "optionSelected" | "closePanel" | "previewRequest" | "optionList" | "previewUpdate";

/**
 * Message format used in communication between the webview and the extension.
 */
interface WebviewMessage {
  /** The specific event type being sent. */
  type: FuzzyPanelEvents;

  /** Optional additional data related to the event. */
  data?: any;
}
