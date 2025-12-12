import { FuzzyProviderType, PreviewRendererType } from "./adapters-namespace";

/**
 * Data that can be previewed by a {@link PreviewRendererType}.
 * Represents the content and optional metadata required to render a preview.
 */
export interface PreviewData<C = any> {
  content: C;
  language?: string;
  metadata?: Record<string, any>;
}

/**
 * Message sent from the backend to update the theme applied in the webview.
 */
export interface ThemeUpdateMessage {
  type: "themeUpdate";
  data: {
    theme: string;
  };
}

export interface LanguageUpdateMessage {
  type: "languageUpdate";
  data: {
    lang: string;
  };
}

/**
 * Message sent from the backend containing an updated list of options.
 */
export interface OptionListMessage {
  type: "optionList";
  data: any[];
  fuzzyProviderType: FuzzyProviderType;
}

/**
 * Message sent from the backend to update the current preview data.
 * Includes the raw preview content, theme, and the adapter type used to render it.
 */
export interface PreviewUpdateMessage {
  type: "previewUpdate";
  data: PreviewData;
  previewAdapterType: PreviewRendererType;
}

export interface ResetFuzzyPanel {
  type: "resetWebview";
}

/**
 * Message sent from the webview informing which option was selected.
 */
export interface OptionSelectedMessage {
  type: "optionSelected";
  data: any;
}

/**
 * Message sent from the webview indicating that it is ready to receive data.
 */
export interface WebviewReadyMessage {
  type: "webviewDOMReady";
  data?: undefined;
}

export interface ShikiInitDone {
  type: "shikInitDone";
}

/**
 * Message sent from the webview requesting the backend to close the panel.
 */
export interface ClosePanelMessage {
  type: "closePanel";
}

/**
 * Message sent from the webview requesting a preview for a given item.
 */
export interface PreviewRequestMessage {
  type: "previewRequest";
  data: any;
}

/**
 * Message sent from the webview containing dynamic search input,
 * typically used to request updated option lists while the user types.
 */
export interface DynamicSearchMessage {
  type: "dynamicSearch";
  query: string;
}

export interface InitShiki {
  type: "shikiInit";
  data: {
    theme: string;
    languages: string[];
  };
}

/**
 * Represents all messages that **the backend sends to the webview**.
 *
 * Note: the "To" prefix is from the backend’s perspective.
 * These messages originate in the backend and are delivered to the webview.
 */
export type ToWebviewKindMessage =
  | PreviewUpdateMessage
  | OptionListMessage
  | ThemeUpdateMessage
  | LanguageUpdateMessage
  | InitShiki
  | ResetFuzzyPanel;

/**
 * Represents all messages that **the webview sends to the backend**.
 *
 * Note: the "From" prefix is from the backend’s perspective.
 * These messages originate in the webview and are received by the backend.
 */
export type FromWebviewKindMessage =
  | WebviewReadyMessage
  | ClosePanelMessage
  | PreviewRequestMessage
  | DynamicSearchMessage
  | OptionSelectedMessage
  | ShikiInitDone;
