import { FromWebviewKindMessage } from "../../shared/extension-webview-protocol";

export class VSCodeApiService {
  private vscode: ReturnType<typeof acquireVsCodeApi>;

  constructor() {
    this.vscode = acquireVsCodeApi();
  }

  postMessage(message: FromWebviewKindMessage): void {
    this.vscode.postMessage(message);
  }

  onDOMReady(): void {
    this.postMessage({ type: "webviewDOMReady" });
  }

  onOptionSelected(option: string): void {
    this.postMessage({ type: "optionSelected", data: option });
  }

  requestClosePanel(): void {
    this.postMessage({ type: "closePanel" });
  }

  requestSelectionPreviewData(selection: string): void {
    this.postMessage({
      type: "previewRequest",
      data: selection,
    });
  }

  requestDynamicSearch(query: string): void {
    this.postMessage({
      type: "dynamicSearch",
      query,
    });
  }
}
