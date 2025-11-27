declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): any;
  setState(state: any): void;
};

type FuzzyPanelEvents = "ready" | "fileSelected" | "closePanel" | "previewRequest" | "fileList" | "previewUpdate";

interface WebviewMessage {
  type: FuzzyPanelEvents;
  data?: any;
}
