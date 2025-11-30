/**
 * Enumeration of all event types exchanged between the webview UI
 * and the extension backend.
 */
export type FuzzyPanelEvents =
  | "ready"
  | "optionSelected"
  | "closePanel"
  | "previewRequest"
  | "optionList"
  | "previewUpdate";

/**
 * Message format used in communication between the webview and the extension.
 */
export interface WebviewMessage {
  /** The specific event type being sent. */
  type: FuzzyPanelEvents;

  /** Optional additional data related to the event. */
  data?: any;
}
