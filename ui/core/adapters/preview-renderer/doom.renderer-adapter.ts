import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { DoomPreviewContent } from "../../../../shared/exchange/doom";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { GameSession } from "../../abstractions/game-session";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { startDoom } from "../../doom/doom-runtime";
import { setGameActive } from "../../game/game-state";

type DoomView = {
  shell: HTMLElement;
  canvas: HTMLCanvasElement;
  launch: HTMLButtonElement;
  launchLabel: HTMLSpanElement;
  feedback: HTMLSpanElement;
  startControls: HTMLElement;
  gameControls: HTMLElement;
  runtimeStatus: HTMLElement;
};

function resolveAssetUrl(path: string): string {
  return new URL(path, document.baseURI).toString();
}

function createViewport(titleImagePath: string): { element: HTMLElement; canvas: HTMLCanvasElement } {
  const element = document.createElement("div");
  element.className = "doom-viewport";

  const title = document.createElement("img");
  title.className = "doom-titlepic";
  title.src = resolveAssetUrl(titleImagePath);
  title.alt = "";
  title.width = 320;
  title.height = 200;

  const canvas = document.createElement("canvas");
  canvas.className = "doom-canvas";
  canvas.width = 320;
  canvas.height = 200;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "DOOM game canvas");

  element.append(title, canvas);
  return { element, canvas };
}

function createStartControls(): {
  element: HTMLElement;
  launch: HTMLButtonElement;
  launchLabel: HTMLSpanElement;
  feedback: HTMLSpanElement;
} {
  const element = document.createElement("div");
  element.className = "doom-start-controls";

  const launch = document.createElement("button");
  launch.className = "doom-launch";
  launch.type = "button";

  const icon = document.createElement("span");
  icon.className = "codicon codicon-debug-start";
  icon.setAttribute("aria-hidden", "true");

  const launchLabel = document.createElement("span");
  launchLabel.textContent = "Play DOOM";

  const feedback = document.createElement("span");
  feedback.className = "doom-feedback";
  feedback.hidden = true;
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");

  launch.append(icon, launchLabel);
  element.append(launch, feedback);
  return { element, launch, launchLabel, feedback };
}

function createGameControls(): HTMLElement {
  const controls = document.createElement("div");
  controls.className = "doom-game-controls";
  controls.hidden = true;

  const controlGroups = [
    ["WASD / arrows", "move"],
    ["Mouse", "aim"],
    ["Click / Space", "fire"],
    ["E", "use"],
    ["Q", "menu"],
    ["1–7", "weapons"],
  ];

  for (const [key, action] of controlGroups) {
    const group = document.createElement("span");
    const keyboardKey = document.createElement("kbd");
    const label = document.createElement("span");
    keyboardKey.textContent = key;
    label.textContent = action;
    group.append(keyboardKey, label);
    controls.append(group);
  }

  return controls;
}

function createDoomView(content: DoomPreviewContent): DoomView {
  const shell = document.createElement("section");
  shell.className = "doom-shell";

  const viewport = createViewport(content.titleImagePath);
  const startControls = createStartControls();
  const gameControls = createGameControls();
  const footer = document.createElement("footer");
  footer.className = "doom-footer";

  const runtimeStatus = document.createElement("span");
  runtimeStatus.className = "doom-runtime-status";
  runtimeStatus.hidden = true;
  runtimeStatus.setAttribute("role", "alert");

  footer.append(startControls.element, gameControls, runtimeStatus);
  shell.append(viewport.element, footer);

  return {
    shell,
    canvas: viewport.canvas,
    launch: startControls.launch,
    launchLabel: startControls.launchLabel,
    feedback: startControls.feedback,
    startControls: startControls.element,
    gameControls,
    runtimeStatus,
  };
}

function preparePreview(previewElement: HTMLElement, shell: HTMLElement): void {
  previewElement.classList.add("doom-preview");
  previewElement.replaceChildren(shell);
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

    const content = data.content as DoomPreviewContent;
    const view = createDoomView(content);
    preparePreview(previewElement, view.shell);
    this.bindInteractions(view, content);
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
        onStatus: (message) => this.handleRuntimeStatus(view, message),
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

  private handleRuntimeStatus(view: DoomView, message: string): void {
    if (!message.startsWith("DOOM stopped:")) return;
    view.gameControls.hidden = true;
    view.runtimeStatus.hidden = false;
    view.runtimeStatus.textContent = message;
  }

  private showLoadingState(view: DoomView): void {
    view.launch.disabled = true;
    view.launchLabel.textContent = "Loading…";
    view.feedback.hidden = true;
  }

  private showRunningState(view: DoomView): void {
    view.startControls.hidden = true;
    view.gameControls.hidden = false;
    view.canvas.focus();
  }

  private showFailureState(view: DoomView, error: unknown): void {
    console.error("[DOOM] Failed to start", error);
    view.launch.disabled = false;
    view.launchLabel.textContent = "Retry";
    view.feedback.hidden = false;
    view.feedback.textContent = error instanceof Error ? error.message : String(error);
  }
}
