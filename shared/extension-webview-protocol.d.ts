import { FuzzyProviderType, PreviewRendererType } from "./adapters-namespace";

/**
 * Data that can be previewed by a {@link PreviewRendererType}.
 * Represents the content and optional metadata required to render a preview.
 */
export interface PreviewData<C = any> {
  content: C;
  language?: string;
  metadata?: Record<string, any>;
  overridePreviewer?: PreviewRendererType;
  overrideTheme?: string;
}

export interface PostQueryHandlerResult {
  data: any;
  action: PostQueryHandlerAction;
}

type TextPreviewContent = {
  kind: "text";
  text: string;
  path: string;
};

type ImagePreviewContent = {
  kind: "image";
  buffer: Uint8Array;
  mimeType: string;
  path: string;
};

type PdfPreviewContent = {
  kind: "pdf";
  buffer: Uint8Array;
  path: string;
};

export type HighlightedCodePreviewContent = TextPreviewContent | ImagePreviewContent | PdfPreviewContent;

export interface HighlightedCodePreviewData extends PreviewData<HighlightedCodePreviewContent> {}

/**
 * Message sent from the backend containing an updated list of options.
 */
export interface OptionListMessage {
  type: "optionList";
  data: any[];
  fuzzyProviderType: FuzzyProviderType;
  isChunk: boolean;
  isLastChunk?: boolean;
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

export interface ResetWebviewMessage {
  type: "resetWebview";
  currentProvider: FuzzyProviderType;
}

export interface RemoveHeavyOptions {
  type: "removeHeavyOptions";
  data: string[];
  fuzzyProviderType: FuzzyProviderType;
}

export interface PostHandleListMessage {
  type: "postHandleListMessage";
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

export interface HighlighterInitDone {
  type: "highlighterInitDone";
}

type LayoutPropUpdate =
  | {
      property: "ivyHeightPct";
      value: number;
    }
  | {
      property: "leftSideWidthPct";
      value: number;
    }
  | {
      property: "rightSideWidthPct";
      value: number;
    };

export interface UpdateLayoutPropMessage {
  type: "updateLayoutProp";
  data: LayoutPropUpdate[];
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
  data: {
    selectedId: string;
  };
}

/**
 * Message sent from the webview containing dynamic search input,
 * typically used to request updated option lists while the user types.
 */
export interface DynamicSearchMessage {
  type: "dynamicSearch";
  query: string;
}

export interface InitHighlighter {
  type: "highlighterInit";
  data: {
    theme: string;
    languages: string[];
  };
}

export type PostQueryHandlerAction = "filterLargeFiles";

export interface PostQueryhandlerResultMessage {
  type: "postQueryHandler";
  data: any;
  action: PostQueryHandlerAction;
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
  | InitHighlighter
  | PostQueryhandlerResultMessage
  | ResetWebviewMessage
  | RemoveHeavyOptions;

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
  | HighlighterInitDone
  | PostHandleListMessage
  | UpdateLayoutPropMessage;
