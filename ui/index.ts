import { StateManager } from "./core/common/code/state-manager";
import { DIContainer } from "./core/common/di-container";
import { WebviewController } from "./core/common/webview.controller";
import { loadDecorators } from "./core/decorators/loader";
import { resizerInitializers } from "./core/render/resizers/config";

async function bootstrap() {
  console.log("[Index] Starting webview initialization...");

  const container = new DIContainer();
  console.log("[Index] Container created");
  await loadDecorators();

  await container.init();
  console.log("[Index] Container initialized");

  const controller = new WebviewController(
    container.previewManager,
    container.optionListManager,
    container.keyboardHandler,
  );
  console.log("[Index] Controller created");

  resizerInitializers[StateManager.layoutMode]?.();

  await controller.initialize();
  console.log("[Index] Controller initialized - Webview ready!");
}

bootstrap().catch((error) => {
  console.error("[Index] Fatal error during initialization:", error);
});
