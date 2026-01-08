/**
 * Simplified Vim motion handler for search input
 * Supports basic Normal and Insert modes with common motions
 */
export class VimInputHandler {
  private mode: "normal" | "insert" = "insert";
  private historyStack: string[] = [];
  private historyIndex = -1;
  private readonly maxHistory = 50;

  constructor(private input: HTMLInputElement) {
    this.setupEventListeners();
    this.updateCursor();
  }

  private setupEventListeners(): void {
    this.input.addEventListener("keydown", (e) => this.handleKeydown(e));
    this.input.addEventListener("input", () => this.saveToHistory());
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.mode === "normal") {
      this.handleNormalMode(e);
    } else {
      this.handleInsertMode(e);
    }
  }

  private handleInsertMode(e: KeyboardEvent): void {
    // Esc or Ctrl+[ to exit insert mode
    if (e.key === "Escape" || (e.ctrlKey && e.key === "[")) {
      e.preventDefault();
      this.enterNormalMode();
      return;
    }
  }

  private handleNormalMode(e: KeyboardEvent): void {
    const { key, ctrlKey, shiftKey } = e;
    const pos = this.input.selectionStart || 0;
    const text = this.input.value;
    const len = text.length;

    let handled = true;

    switch (key) {
      // Movement
      case "h":
        if (pos > 0) this.setCursorPosition(pos - 1);
        break;

      case "l":
        if (pos < len) this.setCursorPosition(pos + 1);
        break;

      case "w": {
        const nextPos = this.findNextWordStart(text, pos);
        this.setCursorPosition(nextPos);
        break;
      }

      case "b": {
        const prevPos = this.findPrevWordStart(text, pos);
        this.setCursorPosition(prevPos);
        break;
      }

      case "e": {
        const endPos = this.findWordEnd(text, pos);
        this.setCursorPosition(endPos);
        break;
      }

      case "0":
        this.setCursorPosition(0);
        break;

      case "$":
        this.setCursorPosition(len);
        break;

      // Deletion
      case "x":
        if (pos < len) {
          this.deleteChar(pos);
        }
        break;

      case "X":
        if (pos > 0) {
          this.deleteChar(pos - 1);
          this.setCursorPosition(pos - 1);
        }
        break;

      case "d":
        if (e.repeat || this.lastKey === "d") {
          // dd - delete entire line
          this.input.value = "";
          this.saveToHistory();
          this.setCursorPosition(0);
          this.input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        this.lastKey = "d";
        setTimeout(() => (this.lastKey = ""), 500);
        break;

      case "D":
        // Delete from cursor to end
        this.input.value = text.substring(0, pos);
        this.saveToHistory();
        this.input.dispatchEvent(new Event("input", { bubbles: true }));
        break;

      // Insert mode transitions
      case "i":
        this.enterInsertMode();
        break;

      case "a":
        this.setCursorPosition(Math.min(pos + 1, len));
        this.enterInsertMode();
        break;

      case "I":
        this.setCursorPosition(0);
        this.enterInsertMode();
        break;

      case "A":
        this.setCursorPosition(len);
        this.enterInsertMode();
        break;

      case "o":
        this.setCursorPosition(len);
        this.enterInsertMode();
        break;

      case "O":
        this.setCursorPosition(0);
        this.enterInsertMode();
        break;

      // Undo
      case "u":
        this.undo();
        break;

      // Redo
      case "r":
        if (ctrlKey) {
          this.redo();
        } else {
          handled = false;
        }
        break;

      // Change
      case "c":
        if (this.lastKey === "c") {
          // cc - change entire line
          this.input.value = "";
          this.saveToHistory();
          this.setCursorPosition(0);
          this.enterInsertMode();
          this.input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        this.lastKey = "c";
        setTimeout(() => (this.lastKey = ""), 500);
        break;

      case "C":
        // Change from cursor to end
        this.input.value = text.substring(0, pos);
        this.saveToHistory();
        this.enterInsertMode();
        this.input.dispatchEvent(new Event("input", { bubbles: true }));
        break;

      default:
        handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private lastKey = "";

  private findNextWordStart(text: string, pos: number): number {
    // Skip current word
    while (pos < text.length && /\S/.test(text[pos])) pos++;
    // Skip whitespace
    while (pos < text.length && /\s/.test(text[pos])) pos++;
    return pos;
  }

  private findPrevWordStart(text: string, pos: number): number {
    if (pos === 0) return 0;
    pos--;
    // Skip whitespace
    while (pos > 0 && /\s/.test(text[pos])) pos--;
    // Skip word
    while (pos > 0 && /\S/.test(text[pos - 1])) pos--;
    return pos;
  }

  private findWordEnd(text: string, pos: number): number {
    // Move to next char if at word boundary
    if (pos < text.length && /\s/.test(text[pos])) {
      while (pos < text.length && /\s/.test(text[pos])) pos++;
    }
    // Move to end of word
    while (pos < text.length - 1 && /\S/.test(text[pos + 1])) pos++;
    return Math.min(pos, text.length);
  }

  private deleteChar(pos: number): void {
    const text = this.input.value;
    this.input.value = text.substring(0, pos) + text.substring(pos + 1);
    this.saveToHistory();
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private setCursorPosition(pos: number): void {
    this.input.setSelectionRange(pos, pos);
  }

  private enterNormalMode(): void {
    this.mode = "normal";
    this.updateCursor();
    // Move cursor back one if at end
    const pos = this.input.selectionStart || 0;
    const len = this.input.value.length;
    if (pos === len && len > 0) {
      this.setCursorPosition(pos - 1);
    }
  }

  private enterInsertMode(): void {
    this.mode = "insert";
    this.updateCursor();
  }

  private updateCursor(): void {
    if (this.mode === "normal") {
      this.input.classList.add("vim-normal-mode");
      this.input.classList.remove("vim-insert-mode");
    } else {
      this.input.classList.add("vim-insert-mode");
      this.input.classList.remove("vim-normal-mode");
    }
  }

  private saveToHistory(): void {
    const value = this.input.value;
    // Don't save duplicate consecutive values
    if (this.historyStack[this.historyIndex] === value) return;

    // Remove any redo history
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);

    this.historyStack.push(value);
    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    }
    this.historyIndex = this.historyStack.length - 1;
  }

  private undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.input.value = this.historyStack[this.historyIndex];
      this.input.dispatchEvent(new Event("input", { bubbles: true }));
      this.setCursorPosition(this.input.value.length);
    }
  }

  private redo(): void {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      this.input.value = this.historyStack[this.historyIndex];
      this.input.dispatchEvent(new Event("input", { bubbles: true }));
      this.setCursorPosition(this.input.value.length);
    }
  }

  /**
   * Get current mode
   */
  public getMode(): "normal" | "insert" {
    return this.mode;
  }

  /**
   * Force mode change (useful for external control)
   */
  public setMode(mode: "normal" | "insert"): void {
    if (mode === "normal") {
      this.enterNormalMode();
    } else {
      this.enterInsertMode();
    }
  }

  /**
   * Destroy handler and cleanup
   */
  public destroy(): void {
    this.input.classList.remove("vim-normal-mode", "vim-insert-mode");
  }
}
