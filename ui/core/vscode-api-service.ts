import { type WebviewMessage } from "@shared/extension-webview-protocol";

export class VSCodeApiService {
  private vscode: ReturnType<typeof acquireVsCodeApi>;

  constructor() {
    this.vscode = acquireVsCodeApi();
  }

  postMessage(message: WebviewMessage): void {
    this.vscode.postMessage(message);
  }

  getState(): any {
    return this.vscode.getState();
  }

  setState(state: any): void {
    this.vscode.setState(state);
  }

  notifyReady(): void {
    this.postMessage({ type: "ready" });
  }

  selectOption(option: string): void {
    this.postMessage({ type: "optionSelected", data: option });
  }

  requestPreview(option: string): void {
    this.postMessage({ type: "previewRequest", data: option });
  }

  closePanel(): void {
    this.postMessage({ type: "closePanel" });
  }

  sendDynamicSearch(query: string): void {
    this.postMessage({
      type: "dynamicSearch",
      data: { query },
    } as any);
  }
}
