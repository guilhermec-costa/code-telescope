declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): any;
  setState(state: any): void;
};

type FuzzyPanelEvents = "ready" | "fileSelected" | "closePanel";

interface WebviewMessage {
  type: FuzzyPanelEvents;
  payload?: any;
}
