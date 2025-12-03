type KeydownHandler = () => void;

export class KeyboardHandler {
  private onMoveUp?: KeydownHandler;
  private onMoveDown?: KeydownHandler;
  private onScrollUp?: KeydownHandler;
  private onScrollDown?: KeydownHandler;
  private onScrollRight?: KeydownHandler;
  private onScrollLeft?: KeydownHandler;
  private onConfirm?: KeydownHandler;
  private onClose?: KeydownHandler;

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

      if (event.ctrlKey && event.key === "u") {
        event.preventDefault();
        this.onScrollUp?.();
      }

      if (event.ctrlKey && event.key === "d") {
        event.preventDefault();
        this.onScrollDown?.();
      }

      if (event.ctrlKey && event.key === "l") {
        event.preventDefault();
        this.onScrollRight?.();
      }

      if (event.ctrlKey && event.key === "h") {
        event.preventDefault();
        this.onScrollLeft?.();
      }
    });
  }

  setMoveUpHandler(handler: KeydownHandler): void {
    this.onMoveUp = handler;
  }

  setMoveDownHandler(handler: KeydownHandler): void {
    this.onMoveDown = handler;
  }

  setScrollUpHandler(handler: KeydownHandler): void {
    this.onScrollUp = handler;
  }

  setScrollDownHandler(handler: KeydownHandler): void {
    this.onScrollDown = handler;
  }

  setScrollRight(handler: KeydownHandler): void {
    this.onScrollRight = handler;
  }

  setScrollLeft(handler: KeydownHandler): void {
    this.onScrollLeft = handler;
  }

  setConfirmHandler(handler: KeydownHandler): void {
    this.onConfirm = handler;
  }

  setCloseHandler(handler: KeydownHandler): void {
    this.onClose = handler;
  }
}
