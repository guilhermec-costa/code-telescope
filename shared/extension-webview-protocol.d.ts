import { FuzzyAdapter, PreviewAdapter } from "./adapters-namespace";

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

export interface PreviewData {
  content: string;
  language?: string;
  metadata?: Record<string, any>;
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
  finderType: FuzzyAdapter;
}

export interface PreviewUpdateMessage {
  type: "previewUpdate";
  data: PreviewData;
  theme: string;
  previewAdapterType: PreviewAdapter;
}

/** Message informing which option was selected */
export interface OptionSelectedMessage {
  type: "optionSelected";
  data: any;
}

export type WebviewMessage =
  | { type: "ready"; data?: undefined }
  | { type: "closePanel"; data?: undefined }
  | { type: "previewRequest"; data: any }
  | { type: "dynamicSearch"; data: any }
  | PreviewUpdateMessage
  | OptionListMessage
  | OptionSelectedMessage
  | ThemeUpdateMessage;
