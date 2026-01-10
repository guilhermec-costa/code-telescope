import { VSCodeApi } from "./code-api";

export type WebviewState = {
  prompt: string;
  selectedIndex: number;
  scrollTop: number;
  previewContent: string | null;
};

/**
 * Manages persisted UI state for the fuzzy finder webview.
 *
 * Exposes semantic state properties via static getters/setters.
 */
export class StateManager {
  public static pathsToExclude: string[] = [];
  private static readonly DEFAULT_STATE: WebviewState = {
    prompt: "",
    selectedIndex: 0,
    scrollTop: 0,
    previewContent: "",
  };

  private static read(): WebviewState {
    return VSCodeApi.getState<WebviewState>() ?? { ...this.DEFAULT_STATE };
  }

  private static write(state: WebviewState): void {
    VSCodeApi.setState(state);
  }

  private static update(patch: Partial<WebviewState>): void {
    const prev = this.read();
    this.write({
      ...prev,
      ...patch,
    });
  }

  static get prompt(): string {
    return this.read().prompt;
  }

  static set prompt(value: string) {
    this.update({ prompt: value });
  }

  static get selectedIndex(): number {
    return this.read().selectedIndex;
  }

  static set selectedIndex(value: number) {
    this.update({ selectedIndex: value });
  }

  static get scrollTop(): number {
    return this.read().scrollTop;
  }

  static set scrollTop(value: number) {
    this.update({ scrollTop: value });
  }

  static get previewContent(): string | null {
    return this.read().previewContent;
  }

  static set previewContent(value: string | null) {
    this.update({ previewContent: value });
  }

  static get state(): WebviewState {
    return this.read();
  }

  static reset(): void {
    this.write({ ...this.DEFAULT_STATE });
  }

  static get layoutMode() {
    return document.body.dataset.layout as LayoutMode;
  }
}

export type LayoutMode = "classic" | "ivy";
