/**
 * Event names for all messages exchanged between extension ⇄ webview.
 */
export type FuzzyPanelEvents =
  | "ready"
  | "optionSelected"
  | "closePanel"
  | "previewRequest"
  | "optionList"
  | "previewUpdate"
  | "themeUpdate";

/* ----------------------------------------------------------
 * SUBTYPES FOR STRUCTURED MESSAGES
 * ---------------------------------------------------------- */

/** Message sent by the extension to update the preview pane */
export interface PreviewUpdateMessage {
  type: "previewUpdate";
  data: {
    content: string;
    language?: string;
    theme?: string;
  };
}

/** Message sent to update the theme applied in the webview */
export interface ThemeUpdateMessage {
  type: "themeUpdate";
  data: {
    theme: string;
  };
}

/** Message containing an updated list of options */
export interface OptionListMessage {
  type: "optionList";
  data: any[];
}

/** Message informing which option was selected */
export interface OptionSelectedMessage {
  type: "optionSelected";
  data: any;
}

/* ----------------------------------------------------------
 * DISCRIMINATED UNION
 * ---------------------------------------------------------- */

export type WebviewMessage =
  | { type: "ready"; data?: undefined }
  | { type: "closePanel"; data?: undefined }
  | { type: "previewRequest"; data: any }
  | OptionListMessage
  | OptionSelectedMessage
  | PreviewUpdateMessage
  | ThemeUpdateMessage;
