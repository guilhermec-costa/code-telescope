import { KeybindingConfig } from "../../../shared/exchange/extension-config";

type KeydownHandler = () => void;

export class KeyboardHandler {
  private defaultConfig: KeybindingConfig = {
    moveDown: "ctrl+j",
    moveUp: "ctrl+k",
    confirm: "enter",
    close: "escape",
    scrollUp: "ctrl+u",
    scrollDown: "ctrl+d",
    scrollLeft: "ctrl+h",
    scrollRight: "ctrl+l",
    promptDelete: "backspace",
  };

  private _cfg: KeybindingConfig;

  get cfg() {
    return this._cfg;
  }

  private onMoveUp?: KeydownHandler;
  private onMoveDown?: KeydownHandler;
  private onScrollUp?: KeydownHandler;
  private onScrollDown?: KeydownHandler;
  private onScrollRight?: KeydownHandler;
  private onScrollLeft?: KeydownHandler;
  private onConfirm?: KeydownHandler;
  private onClose?: KeydownHandler;
  private onPromptDelete?: KeydownHandler;

  constructor(customConfig?: Partial<KeybindingConfig>) {
    this._cfg = this.mergeConfig(customConfig);
    this.setupListeners();
  }

  private mergeConfig(customConfig?: Partial<KeybindingConfig>): KeybindingConfig {
    return { ...this.defaultConfig, ...customConfig };
  }

  private isArrow(event: KeyboardEvent, key: string): boolean {
    return event.key === key;
  }

  private isCtrlArrow(event: KeyboardEvent, key: string): boolean {
    return event.ctrlKey && event.key === key;
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
      if (this.isCtrlArrow(event, "ArrowDown")) {
        event.preventDefault();
        event.stopPropagation();
        this.onScrollDown?.();
        return;
      }

      if (this.isCtrlArrow(event, "ArrowUp")) {
        event.preventDefault();
        event.stopPropagation();
        this.onScrollUp?.();
        return;
      }

      if (this.isArrow(event, "ArrowDown")) {
        event.preventDefault();
        event.stopPropagation();
        this.onMoveDown?.();
        return;
      }

      if (this.isArrow(event, "ArrowUp")) {
        event.preventDefault();
        event.stopPropagation();
        this.onMoveUp?.();
        return;
      }

      if (this.isCtrlArrow(event, "ArrowRight")) {
        event.preventDefault();
        event.stopPropagation();
        this.onScrollRight?.();
        return;
      }

      if (this.isCtrlArrow(event, "ArrowLeft")) {
        event.preventDefault();
        event.stopPropagation();
        this.onScrollLeft?.();
        return;
      }
      const actions = [
        { key: this._cfg.moveDown, handler: () => this.onMoveDown?.() },
        { key: this._cfg.moveUp, handler: () => this.onMoveUp?.() },
        { key: this._cfg.confirm, handler: () => this.onConfirm?.() },
        { key: this._cfg.close, handler: () => this.onClose?.() },
        { key: this._cfg.scrollUp, handler: () => this.onScrollUp?.() },
        { key: this._cfg.scrollDown, handler: () => this.onScrollDown?.() },
        { key: this._cfg.scrollLeft, handler: () => this.onScrollLeft?.() },
        { key: this._cfg.scrollRight, handler: () => this.onScrollRight?.() },
        { key: this._cfg.promptDelete, handler: () => this.onPromptDelete?.() },
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
  setPromptDeleteHandler(handler: KeydownHandler): void {
    this.onPromptDelete = handler;
  }
}
