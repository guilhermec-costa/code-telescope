import { OptionListManager } from "../core/common/option-list-manager";
import { WebviewToExtensionMessenger } from "../core/common/wv-to-extension-messenger";

export class HarpoonKeyPlugin {
  private waitingSecondD = false;
  private secondDTimeout: ReturnType<typeof setTimeout> | null = null;
  private hasCut = false;

  private readonly SECOND_D_TIMEOUT_MS = 400;

  constructor(private readonly searchElement: HTMLInputElement) {
    this.attach();
  }

  private attach(): void {
    window.addEventListener("keydown", this.handleKeydown.bind(this), true);
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.target === this.searchElement && this.searchElement.value.length > 0) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === "d") {
      e.preventDefault();
      e.stopPropagation();

      if (this.waitingSecondD) {
        // second d — confirm dd
        this.clearSecondDTimeout();
        this.waitingSecondD = false;
        this.deleteCurrent();
      } else {
        // first d — wait for second
        this.waitingSecondD = true;
        this.secondDTimeout = setTimeout(() => {
          this.waitingSecondD = false;
        }, this.SECOND_D_TIMEOUT_MS);
      }
      return;
    }

    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      e.stopPropagation();
      this.pasteCurrent(e.shiftKey);
      return;
    }

    if (this.waitingSecondD) {
      this.clearSecondDTimeout();
      this.waitingSecondD = false;
    }
  }

  private deleteCurrent(): void {
    const value = OptionListManager.instance.getSelectedValue();
    if (value === undefined) return;
    this.hasCut = true;
    WebviewToExtensionMessenger.instance.sendHarpoonAction("delete", parseInt(value, 10));
  }

  private pasteCurrent(above: boolean): void {
    if (!this.hasCut) return;
    const value = OptionListManager.instance.getSelectedValue();
    if (value === undefined) return;

    const toIndex = parseInt(value, 10);
    this.hasCut = false;
    WebviewToExtensionMessenger.instance.sendHarpoonAction("paste", above ? toIndex : toIndex + 1);
  }

  private clearSecondDTimeout(): void {
    if (this.secondDTimeout !== null) {
      clearTimeout(this.secondDTimeout);
      this.secondDTimeout = null;
    }
  }

  public destroy(): void {
    window.removeEventListener("keydown", this.handleKeydown.bind(this), true);
    this.clearSecondDTimeout();
  }
}
