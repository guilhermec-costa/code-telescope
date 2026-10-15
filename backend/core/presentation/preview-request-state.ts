export abstract class PreviewRequestState {
  static latestPreviewRequestId: number = 0;
  private static activeController: AbortController | undefined;

  static getLatestPreviewRequestId() {
    return this.latestPreviewRequestId;
  }

  static setLatestPreviewRequestId(id: number): void {
    this.activeController?.abort();
    this.latestPreviewRequestId = id;
    this.activeController = new AbortController();
  }

  static getActiveSignal(): AbortSignal | undefined {
    return this.activeController?.signal;
  }

  static isLatest(id: number): boolean {
    return id === this.latestPreviewRequestId && !this.activeController?.signal.aborted;
  }

  static resetPreviewRequestId(): void {
    this.activeController?.abort();
    this.activeController = undefined;
    this.latestPreviewRequestId = 0;
  }
}
