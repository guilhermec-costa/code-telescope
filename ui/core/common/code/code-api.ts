/**
 * Low-level singleton wrapper around the VS Code Webview API.
 */
export class VSCodeApi {
  private static _instance: ReturnType<typeof acquireVsCodeApi> | null = null;

  private constructor() {}

  private static get api(): ReturnType<typeof acquireVsCodeApi> {
    if (!this._instance) {
      this._instance = acquireVsCodeApi();
    }
    return this._instance;
  }

  static getState<T>(): T | undefined {
    return this.api.getState() as T | undefined;
  }

  static setState<T>(state: T): void {
    this.api.setState(state);
  }

  static postMessage(message: unknown): void {
    this.api.postMessage(message);
  }
}
