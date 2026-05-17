import { WebviewSessionState } from "../../../../shared/extension-webview-protocol";
import { VSCodeApi } from "./code-api";

export type MatchingAlgorithm = "substring" | "subsequence";

declare const __MATCHING_CFG__: { algorithm: MatchingAlgorithm };

/**
 * Manages persisted UI state for the fuzzy finder webview.
 *
 * Exposes semantic state properties via static getters/setters.
 */
export class SessionStateManager {
  private static readonly DEFAULT_SESSION_STATE: WebviewSessionState = {
    query: "",
    selectedIndex: 0,
  };

  private static write(state: WebviewSessionState): void {
    VSCodeApi.setState(state);
  }

  static read(): WebviewSessionState {
    return VSCodeApi.getState<WebviewSessionState>() ?? { ...this.DEFAULT_SESSION_STATE };
  }

  static patch(patch: Partial<WebviewSessionState>): void {
    const prev = this.read();
    this.write({
      ...prev,
      ...patch,
    });
  }

  static get layoutMode() {
    return document.body.dataset.layout as LayoutMode;
  }

  static get matchingAlgorithm(): MatchingAlgorithm {
    if (typeof __MATCHING_CFG__ !== "undefined") {
      return __MATCHING_CFG__.algorithm;
    }
    return "substring";
  }
}

export type LayoutMode = "classic" | "ivy";
