export class VimInputHandler {
  private mode: "normal" | "insert" = "insert";
  private historyStack: string[] = [];
  private historyIndex = -1;
  private readonly maxHistory = 50;
  private cursorElement: HTMLDivElement | null = null;
  private yankVisualElement: HTMLDivElement | null = null;
  private count = 0;
  private yankBuffer = "";
  private pendingFindChar: { type: "f" | "F" | "t" | "T" } | null = null;
  private operator: { type: "d" | "c" | "y"; count: number } | null = null;
  private lastFindChar: { char: string; type: "f" | "F" | "t" | "T" } | null = null;

  constructor(private input: HTMLInputElement) {
    this.setupEventListeners();
    this.createCursorElement();
    this.createYankFlashElement();
    this.updateCursor();
  }

  private createCursorElement(): void {
    this.cursorElement = document.createElement("div");
    this.cursorElement.className = "vim-block-cursor";
    this.cursorElement.style.cssText = `
      position: absolute;
      width: 8px;
      height: 1.2em;
      background-color: var(--fg);
      pointer-events: none;
      z-index: 1000;
      display: none;
    `;
    document.body.appendChild(this.cursorElement);
  }

  private createYankFlashElement(): void {
    this.yankVisualElement = document.createElement("div");
    this.yankVisualElement.className = "vim-yank-flash";
    document.body.appendChild(this.yankVisualElement);
  }

  private getTextWidth(text: string): number {
    const inputStyle = window.getComputedStyle(this.input);
    const span = document.createElement("span");
    span.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: pre;
    font-family: ${inputStyle.fontFamily};
    font-size: ${inputStyle.fontSize};
    font-weight: ${inputStyle.fontWeight};
    letter-spacing: ${inputStyle.letterSpacing};
  `;
    span.textContent = text;
    document.body.appendChild(span);
    const width = span.offsetWidth;
    document.body.removeChild(span);
    return width;
  }

  private flashYank(start: number, end: number): void {
    if (!this.yankVisualElement || start === end) return;

    const text = this.input.value;
    const inputStyle = window.getComputedStyle(this.input);
    const rect = this.input.getBoundingClientRect();

    const offsetLeft = this.getTextWidth(text.substring(0, start));
    const yankedWidth = this.getTextWidth(text.substring(start, end));

    const paddingLeft = parseFloat(inputStyle.paddingLeft) || 0;
    const borderLeft = parseFloat(inputStyle.borderLeftWidth) || 0;
    const lineHeight = parseFloat(inputStyle.lineHeight) || parseFloat(inputStyle.fontSize) || rect.height;

    const style = this.yankVisualElement.style;
    style.width = `${yankedWidth}px`;
    style.height = `${lineHeight}px`;
    style.top = `${rect.top + (rect.height - lineHeight) / 2 + window.scrollY}px`;
    style.left = `${rect.left + paddingLeft + borderLeft + offsetLeft + window.scrollX}px`;

    this.yankVisualElement.classList.add("flashing");
    setTimeout(() => this.yankVisualElement?.classList.remove("flashing"), 80);
  }

  private updateCursorPosition(): void {
    this.input.style.caretColor = "transparent";
    const pos = this.input.selectionStart || 0;
    const text = this.input.value;
    const inputStyle = window.getComputedStyle(this.input);

    const span = document.createElement("span");
    span.style.cssText = `
      position: absolute;
      visibility: hidden;
      white-space: pre;
      font-family: ${inputStyle.fontFamily};
      font-size: ${inputStyle.fontSize};
      font-weight: ${inputStyle.fontWeight};
      letter-spacing: ${inputStyle.letterSpacing};
      box-sizing: ${inputStyle.boxSizing};
    `;
    span.textContent = text.substring(0, pos);
    document.body.appendChild(span);

    const rect = this.input.getBoundingClientRect();
    const textWidth = span.offsetWidth;
    document.body.removeChild(span);

    const paddingLeft = parseFloat(inputStyle.paddingLeft) || 0;
    const borderLeft = parseFloat(inputStyle.borderLeftWidth) || 0;
    const lineHeight = parseFloat(inputStyle.lineHeight) || parseFloat(inputStyle.fontSize) || rect.height;

    this.cursorElement.style.left = `${rect.left + paddingLeft + borderLeft + textWidth}px`;
    this.cursorElement.style.top = `${rect.top + (rect.height - lineHeight) / 2}px`;
    this.cursorElement.style.display = "block";
  }

  private setupEventListeners(): void {
    this.input.addEventListener("keydown", (e) => this.handleKeydown(e));
    this.input.addEventListener("input", () => {
      this.saveToHistory();
      this.updateCursorPosition();
    });
    this.input.addEventListener("click", () => this.updateCursorPosition());
    this.input.addEventListener("focus", () => this.updateCursorPosition());
    window.addEventListener("resize", () => this.updateCursorPosition());
    window.addEventListener("scroll", () => this.updateCursorPosition(), true);
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (this.mode === "normal") {
      this.handleNormalMode(e);
    } else {
      this.handleInsertMode(e);
    }
    requestAnimationFrame(() => this.updateCursorPosition());
  }

  private handleInsertMode(e: KeyboardEvent): void {
    if (e.key === "Escape" || (e.ctrlKey && e.key === "[")) {
      e.preventDefault();
      this.enterNormalMode();
      return;
    }
  }

  private handleNormalMode(e: KeyboardEvent): void {
    const { key, ctrlKey } = e;

    // handle pending find character (f, F, t, T)
    if (this.pendingFindChar) {
      e.preventDefault();
      e.stopPropagation();
      if (key.length === 1) {
        const currentPos = this.input.selectionStart || 0;
        let targetPos = currentPos;

        // simulates the search
        if (this.pendingFindChar.type === "f") targetPos = this.findCharForward(this.input.value, currentPos + 1, key);
        else if (this.pendingFindChar.type === "F")
          targetPos = this.findCharBackward(this.input.value, currentPos - 1, key);
        else if (this.pendingFindChar.type === "t") {
          const fPos = this.findCharForward(this.input.value, currentPos + 1, key);
          targetPos = fPos > currentPos ? fPos - 1 : currentPos;
        } else if (this.pendingFindChar.type === "T") {
          const bPos = this.findCharBackward(this.input.value, currentPos - 1, key);
          targetPos = bPos >= 0 && bPos < currentPos ? bPos + 1 : currentPos;
        }

        this.processMotion(targetPos);
        this.lastFindChar = { char: key, type: this.pendingFindChar.type };
      }
      this.pendingFindChar = null;
      return;
    }

    // count
    if (key >= "1" && key <= "9") {
      const isDoublingCmd = this.operator && key === this.operator.type;
      if (!isDoublingCmd) {
        e.preventDefault();
        this.count = this.count * 10 + parseInt(key, 10);
        return;
      }
    }

    if (preventCommands.includes(key) || (key === "[" && ctrlKey)) {
      e.preventDefault();
    } else {
      return;
    }

    const pos = this.input.selectionStart || 0;
    const text = this.input.value;
    const len = text.length;
    const motionCount = this.count || 1;
    this.count = 0; // reset count

    let targetPos = pos;
    let isMotion = false;

    switch (key) {
      // operators
      case "d":
      case "c":
      case "y":
        if (this.operator && this.operator.type === key) {
          // double key (dd, cc, yy)
          if (key === "y") {
            this.yankBuffer = text;
            this.flashYank(0, text.length);
          } else {
            this.yankBuffer = text; // delete also copies
            this.input.value = "";
            this.saveToHistory();
            this.input.dispatchEvent(new Event("input", { bubbles: true }));
            if (key === "c") this.enterInsertMode();
          }
          this.operator = null;
          this.setCursorPosition(0);
        } else {
          // start operator
          this.operator = { type: key as "d" | "c" | "y", count: motionCount };
        }
        return;

      // movements
      case "h":
        targetPos = Math.max(0, pos - motionCount);
        isMotion = true;
        break;
      case "l":
        targetPos = Math.min(len - 1, pos + motionCount);
        isMotion = true;
        break;
      case "w":
        targetPos = pos;
        for (let i = 0; i < motionCount; i++) targetPos = this.findNextWordStart(text, targetPos);
        isMotion = true;
        break;
      case "b":
        targetPos = pos;
        for (let i = 0; i < motionCount; i++) targetPos = this.findPrevWordStart(text, targetPos);
        isMotion = true;
        break;
      case "e":
        targetPos = pos;
        for (let i = 0; i < motionCount; i++) targetPos = this.findWordEnd(text, targetPos);
        if (this.operator) targetPos++;
        isMotion = true;
        break;
      case "0":
        targetPos = 0;
        isMotion = true;
        break;
      case "$":
        targetPos = len;
        isMotion = true;
        break;

      // find characters
      case "f":
      case "F":
      case "t":
      case "T":
        this.pendingFindChar = { type: key as any };
        return; // returns and waits for next call of the function

      case ";":
        if (this.lastFindChar) {
          targetPos = this.repeatFindChar(true);
          isMotion = true;
        }
        break;
      case ",":
        if (this.lastFindChar) {
          targetPos = this.repeatFindChar(false);
          isMotion = true;
        }
        break;

      // no operator related cases
      case "x":
        this.deleteRange(pos, Math.min(pos + motionCount, len));
        return;
      case "p":
        this.pasteAfter(pos);
        return;
      case "P":
        this.pasteBefore(pos);
        return;
      case "u":
        this.undo();
        return;
      case "r":
        if (ctrlKey) {
          e.preventDefault();
          this.redo();
        }
        return;
      case "i":
        this.enterInsertMode();
        return;
      case "a":
        this.setCursorPosition(Math.min(pos + 1, len));
        this.enterInsertMode();
        return;
      case "A":
        this.setCursorPosition(len);
        this.enterInsertMode();
        return;
    }

    if (isMotion) {
      this.processMotion(targetPos);
    }
  }

  private processMotion(targetPos: number): void {
    const currentPos = this.input.selectionStart || 0;

    if (!this.operator) {
      const safePos = Math.min(targetPos, this.input.value.length - 1);
      this.setCursorPosition(Math.max(0, safePos));
      return;
    }

    const start = Math.min(currentPos, targetPos);
    const end = Math.max(currentPos, targetPos);

    const { type } = this.operator;
    this.operator = null;

    if (type === "y") {
      this.yankBuffer = this.input.value.substring(start, end);
      this.flashYank(start, end);
    } else if (type === "d") {
      this.deleteRange(start, end);
    } else if (type === "c") {
      this.deleteRange(start, end);
      this.enterInsertMode();
    }
  }

  private repeatFindChar(sameDirection: boolean): number {
    if (!this.lastFindChar) return this.input.selectionStart || 0;

    const pos = this.input.selectionStart || 0;
    const text = this.input.value;
    const { char, type } = this.lastFindChar;

    let actualType = type;
    if (!sameDirection) {
      // Reverse direction
      if (type === "f") actualType = "F";
      else if (type === "F") actualType = "f";
      else if (type === "t") actualType = "T";
      else if (type === "T") actualType = "t";
    }

    let newPos = pos;
    switch (actualType) {
      case "f":
        newPos = this.findCharForward(text, pos + 1, char);
        break;
      case "F":
        newPos = this.findCharBackward(text, pos - 1, char);
        break;
      case "t":
        const fPos = this.findCharForward(text, pos + 1, char);
        newPos = fPos > pos ? fPos - 1 : pos;
        break;
      case "T":
        const bPos = this.findCharBackward(text, pos - 1, char);
        newPos = bPos >= 0 && bPos < pos ? bPos + 1 : pos;
        break;
    }

    return newPos;
  }

  private findCharForward(text: string, startPos: number, char: string): number {
    for (let i = startPos; i < text.length; i++) {
      if (text[i] === char) return i;
    }
    return startPos - 1; // stay in place if not found
  }

  private findCharBackward(text: string, startPos: number, char: string): number {
    for (let i = startPos; i >= 0; i--) {
      if (text[i] === char) return i;
    }
    return startPos + 1; // stay in place if not found
  }

  private findNextWordStart(text: string, pos: number): number {
    // skip current word
    while (pos < text.length && /\S/.test(text[pos])) pos++;
    // skip whitespace
    while (pos < text.length && /\s/.test(text[pos])) pos++;
    return Math.min(pos, text.length);
  }

  private findPrevWordStart(text: string, pos: number): number {
    if (pos === 0) return 0;
    pos = Math.max(0, pos - 1);
    // skip whitespace
    while (pos > 0 && /\s/.test(text[pos])) pos--;
    // skip to start of word
    while (pos > 0 && /\S/.test(text[pos - 1])) pos--;
    return pos;
  }

  private findWordEnd(text: string, pos: number): number {
    // if at whitespace, skip it
    if (pos < text.length && /\s/.test(text[pos])) {
      while (pos < text.length && /\s/.test(text[pos])) pos++;
    } else {
      // move forward one to start searching
      pos++;
    }
    // find end of current/next word
    while (pos < text.length && /\S/.test(text[pos])) pos++;
    return Math.max(0, Math.min(pos - 1, text.length - 1));
  }

  private deleteRange(start: number, end: number): void {
    if (start >= end) return;
    const text = this.input.value;
    this.yankBuffer = text.substring(start, end); // Auto-yank on delete
    this.input.value = text.substring(0, start) + text.substring(end);
    this.saveToHistory();
    this.setCursorPosition(Math.min(start, this.input.value.length - 1));
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private pasteAfter(pos: number): void {
    if (!this.yankBuffer) return;
    const text = this.input.value;
    const insertPos = Math.min(pos + 1, text.length);
    this.input.value = text.substring(0, insertPos) + this.yankBuffer + text.substring(insertPos);
    this.saveToHistory();
    this.setCursorPosition(insertPos + this.yankBuffer.length - 1);
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private pasteBefore(pos: number): void {
    if (!this.yankBuffer) return;
    const text = this.input.value;
    this.input.value = text.substring(0, pos) + this.yankBuffer + text.substring(pos);
    this.saveToHistory();
    this.setCursorPosition(pos + this.yankBuffer.length - 1);
    this.input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private setCursorPosition(pos: number): void {
    const safePos = Math.max(0, Math.min(pos, this.input.value.length));
    this.input.setSelectionRange(safePos, safePos);
    this.updateCursorPosition();
  }

  private enterNormalMode(): void {
    this.mode = "normal";
    this.updateCursor();
    const pos = this.input.selectionStart || 0;
    const len = this.input.value.length;
    if (pos >= len && len > 0) {
      this.setCursorPosition(len - 1);
    }
    this.updateCursorPosition();
  }

  private enterInsertMode(): void {
    this.mode = "insert";
    this.updateCursor();
  }

  private updateCursor(): void {
    if (this.mode === "normal") {
      this.input.classList.add("vim-normal-mode");
      this.input.classList.remove("vim-insert-mode");
      this.input.style.caretColor = "transparent";
    } else {
      this.input.classList.add("vim-insert-mode");
      this.input.classList.remove("vim-normal-mode");
      this.input.style.caretColor = "";
    }
    this.updateCursorPosition();
  }

  private saveToHistory(): void {
    const value = this.input.value;
    if (this.historyStack[this.historyIndex] === value) return;
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
      this.setCursorPosition(this.input.value.length - 1);
    }
  }

  private redo(): void {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      this.input.value = this.historyStack[this.historyIndex];
      this.input.dispatchEvent(new Event("input", { bubbles: true }));
      this.setCursorPosition(this.input.value.length - 1);
    }
  }

  public getMode(): "normal" | "insert" {
    return this.mode;
  }

  public setMode(mode: "normal" | "insert"): void {
    if (mode === "normal") {
      this.enterNormalMode();
    } else {
      this.enterInsertMode();
    }
  }

  public destroy(): void {
    this.input.classList.remove("vim-normal-mode", "vim-insert-mode");
    this.input.style.caretColor = "";
    if (this.cursorElement && this.cursorElement.parentNode) {
      this.cursorElement.parentNode.removeChild(this.cursorElement);
    }
  }
}

const preventCommands = [
  "h",
  "j",
  "k",
  "l",
  "w",
  "b",
  "e",
  "W",
  "B",
  "E",
  "0",
  "$",
  "^",
  "x",
  "X",
  "D",
  "C",
  "i",
  "I",
  "a",
  "A",
  "o",
  "O",
  "p",
  "P",
  "u",
  "r",
  "y",
  "d",
  "c",
  "f",
  "F",
  "t",
  "T",
  ";",
  ",",
  "g",
];
