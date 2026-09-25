import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { DoomPreviewContent } from "../../../../shared/exchange/doom";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { GameSession } from "../../abstractions/game-session";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { startDoom } from "../../doom/doom-runtime";
import { setGameActive } from "../../game/game-state";

type DoomHeader = {
  element: HTMLElement;
  status: HTMLSpanElement;
};

type DoomViewport = {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  launch: HTMLButtonElement;
  launchTitle: HTMLSpanElement;
  launchDetail: HTMLSpanElement;
};

type DoomView = DoomViewport & {
  shell: HTMLElement;
  status: HTMLSpanElement;
};

function createHeader(): DoomHeader {
  const element = document.createElement("header");
  element.className = "doom-header";

  const title = document.createElement("strong");
  title.textContent = "DOOM SHAREWARE // E1M1";

  const status = document.createElement("span");
  status.className = "doom-status";
  status.textContent = "READY";

  element.append(title, status);
  return { element, status };
}

function createViewport(): DoomViewport {
  const element = document.createElement("div");
  element.className = "doom-viewport";

  const canvas = document.createElement("canvas");
  canvas.className = "doom-canvas";
  canvas.width = 320;
  canvas.height = 200;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "DOOM game canvas");

  const launch = document.createElement("button");
  launch.className = "doom-launch";
  launch.type = "button";

  const launchTitle = document.createElement("span");
  launchTitle.className = "doom-launch-title";
  launchTitle.textContent = "CLICK TO RUN DOOM";

  const launchDetail = document.createElement("span");
  launchDetail.textContent = "Local WebAssembly · 4.5 MB";

  launch.append(launchTitle, launchDetail);
  element.append(canvas, launch);

  return { element, canvas, launch, launchTitle, launchDetail };
}

function createControls(): HTMLElement {
  const controls = document.createElement("footer");
  controls.className = "doom-controls";
  controls.textContent = "WASD / ARROWS move · MOUSE aim · CLICK / SPACE fire · E use · Q menu · 1–7 weapons";
  return controls;
}

function createDoomView(): DoomView {
  const shell = document.createElement("section");
  shell.className = "doom-shell";

  const header = createHeader();
  const viewport = createViewport();
  shell.append(header.element, viewport.element, createControls());

  return {
    shell,
    status: header.status,
    ...viewport,
  };
}

function preparePreview(previewElement: HTMLElement, shell: HTMLElement): void {
  previewElement.classList.add("doom-preview");
  previewElement.replaceChildren(shell);
}

function resolveAssetUrl(path: string): string {
  return new URL(path, document.baseURI).toString();
}

@PreviewRendererAdapter({
  adapter: "preview.doom",
})
export class DoomRendererAdapter implements IPreviewRendererAdapter {
  type!: PreviewRendererType;
  private session?: GameSession;
  private loadController?: AbortController;
  private previewElement?: HTMLElement;

  async render(previewElement: HTMLElement, data: PreviewData<DoomPreviewContent>): Promise<void> {
    this.cleanup();
    this.previewElement = previewElement;
    setGameActive(true);

    const view = createDoomView();
    preparePreview(previewElement, view.shell);
    this.bindInteractions(view, data.content as DoomPreviewContent);
  }

  cleanup(): void {
    this.loadController?.abort();
    this.loadController = undefined;
    this.session?.stop();
    this.session = undefined;
    this.previewElement?.classList.remove("doom-preview");
    this.previewElement = undefined;
    setGameActive(false);
  }

  private bindInteractions(view: DoomView, content: DoomPreviewContent): void {
    view.launch.addEventListener("click", () => void this.launchGame(view, content));
    view.canvas.addEventListener("click", () => void this.session?.capturePointer());
  }

  private async launchGame(view: DoomView, content: DoomPreviewContent): Promise<void> {
    this.loadController?.abort();
    const loadController = new AbortController();
    this.loadController = loadController;
    this.showLoadingState(view);

    try {
      const session = await startDoom({
        canvas: view.canvas,
        engineUrl: resolveAssetUrl(content.enginePath),
        musicEngineUrl: resolveAssetUrl(content.musicEnginePath),
        wadUrl: resolveAssetUrl(content.wadPath),
        signal: loadController.signal,
        onStatus: (message) => {
          view.status.textContent = message;
        },
      });
      if (loadController.signal.aborted || this.loadController !== loadController) {
        session.stop();
        return;
      }
      this.session = session;
      this.showRunningState(view);
    } catch (error) {
      if (loadController.signal.aborted) return;
      this.showFailureState(view, error);
    } finally {
      if (this.loadController === loadController) this.loadController = undefined;
    }
  }

  private showLoadingState(view: DoomView): void {
    view.launch.disabled = true;
    view.status.textContent = "LOADING";
    view.launchTitle.textContent = "LOADING HELL...";
  }

  private showRunningState(view: DoomView): void {
    view.launch.remove();
    view.status.textContent = "RUNNING — CLICK GAME TO CAPTURE MOUSE";
    view.canvas.focus();
  }

  private showFailureState(view: DoomView, error: unknown): void {
    console.error("[DOOM] Failed to start", error);
    view.status.textContent = "FAILED";
    view.launch.disabled = false;
    view.launchTitle.textContent = "RETRY DOOM";
    view.launchDetail.textContent = error instanceof Error ? error.message : String(error);
  }
}
