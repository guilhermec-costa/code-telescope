export abstract class DynamicSearchState {
  private static activeRequest: { requestId: string; controller: AbortController } | undefined;

  static start(requestId: string): AbortController {
    this.cancel();
    const controller = new AbortController();
    this.activeRequest = { requestId, controller };
    return controller;
  }

  static isActive(requestId: string, controller: AbortController): boolean {
    return (
      this.activeRequest?.requestId === requestId &&
      this.activeRequest.controller === controller &&
      !controller.signal.aborted
    );
  }

  static finish(requestId: string, controller: AbortController): void {
    if (this.isActive(requestId, controller)) this.activeRequest = undefined;
  }

  static cancel(): void {
    this.activeRequest?.controller.abort();
    this.activeRequest = undefined;
  }
}
