import { DIContainer } from "./core/di-container";
import { WebviewController } from "./core/webview-controller";
import "./core/finder-data-adapters/data-adapter.loader";

(async () => {
  try {
    console.log("[Index] Starting webview initialization...");

    const container = new DIContainer();
    console.log("[Index] Container created");

    await container.init();
    console.log("[Index] Container initialized");

    const controller = new WebviewController(
      container.vscodeService,
      container.previewManager,
      container.optionListManager,
      container.keyboardHandler,
      container.adapterRegistry,
    );
    console.log("[Index] Controller created");

    await controller.initialize();
    console.log("[Index] Controller initialized - Webview ready!");
  } catch (error) {
    console.error("[Index] Fatal error during initialization:", error);
  }
})();
