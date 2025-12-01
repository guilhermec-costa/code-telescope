export class KeyboardHandler {
  private onMoveUp?: () => void;
  private onMoveDown?: () => void;
  private onConfirm?: () => void;
  private onClose?: () => void;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "j") {
        event.preventDefault();
        event.stopPropagation();
        this.onMoveDown?.();
      }

      if (event.ctrlKey && event.key === "k") {
        event.preventDefault();
        event.stopPropagation();
        this.onMoveUp?.();
      }

      if (event.key === "Enter") {
        event.preventDefault();
        this.onConfirm?.();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        this.onClose?.();
      }
    });
  }

  setMoveUpHandler(handler: () => void): void {
    this.onMoveUp = handler;
  }

  setMoveDownHandler(handler: () => void): void {
    this.onMoveDown = handler;
  }

  setConfirmHandler(handler: () => void): void {
    this.onConfirm = handler;
  }

  setCloseHandler(handler: () => void): void {
    this.onClose = handler;
  }
}
