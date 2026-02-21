export abstract class PreviewRequestState {
  static latestPreviewRequestId: number = 0;

  static getLatestPreviewRequestId() {
    return this.latestPreviewRequestId;
  }

  static setLatestPreviewRequestId(id: number): void {
    this.latestPreviewRequestId = id;
  }

  static resetPreviewRequestId(): void {
    this.latestPreviewRequestId = 0;
  }
}
