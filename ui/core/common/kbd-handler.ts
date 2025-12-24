import { KeybindingConfig } from "../../../shared/exchange/extension-config";

type KeydownHandler = () => void;

export class KeyboardHandler {
  private cfg: KeybindingConfig =
    typeof __KEYBINDINGS_CFG__ !== "undefined"
      ? __KEYBINDINGS_CFG__
      : {
          moveDown: "ctrl+j",
          moveUp: "ctrl+k",
          confirm: "enter",
          close: "escape",
          scrollUp: "ctrl+u",
          scrollDown: "ctrl+d",
          scrollLeft: "ctrl+h",
          scrollRight: "ctrl+l",
        };

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

  private match(event: KeyboardEvent, binding: string): boolean {
    if (!binding) return false;

    const parts = binding.toLowerCase().split("+");
    const targetKey = parts.pop();

    const hasCtrl = parts.includes("ctrl");
    const hasAlt = parts.includes("alt");
    const hasShift = parts.includes("shift");
    const hasMeta = parts.includes("meta");

    return (
      event.key.toLowerCase() === targetKey &&
      event.ctrlKey === hasCtrl &&
      event.altKey === hasAlt &&
      event.shiftKey === hasShift &&
      event.metaKey === hasMeta
    );
  }

  private setupListeners(): void {
    document.addEventListener("keydown", (event) => {
      const actions = [
        { key: this.cfg.moveDown, handler: () => this.onMoveDown?.() },
        { key: this.cfg.moveUp, handler: () => this.onMoveUp?.() },
        { key: this.cfg.confirm, handler: () => this.onConfirm?.() },
        { key: this.cfg.close, handler: () => this.onClose?.() },
        { key: this.cfg.scrollUp, handler: () => this.onScrollUp?.() },
        { key: this.cfg.scrollDown, handler: () => this.onScrollDown?.() },
        { key: this.cfg.scrollLeft, handler: () => this.onScrollLeft?.() },
        { key: this.cfg.scrollRight, handler: () => this.onScrollRight?.() },
      ];

      for (const action of actions) {
        if (this.match(event, action.key)) {
          event.preventDefault();
          event.stopPropagation();
          action.handler();
          break;
        }
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
