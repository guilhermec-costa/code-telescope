declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): any;
  setState(state: any): void;
};

interface WebviewMessage {
  type: string;
  payload?: any;
}
