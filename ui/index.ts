import { DIContainer } from "./core/services/di-container";
import { WebviewController } from "./core/services/webview-controller";

import "./core/adapters/data/loader";
import "./core/adapters/preview-renderer/loader";

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
