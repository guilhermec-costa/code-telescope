import { DIContainer } from "./core/common/di-container";
import { WebviewController } from "./core/common/webview.controller";

import "./core/adapters/data/loader";
import "./core/adapters/preview-renderer/loader";
import { ClassicLayoutResizer } from "./core/render/resizers/classic-layout-resizer";
import { IvyLayoutResizer } from "./core/render/resizers/ivy-layout-resizer";

(async () => {
  try {
    console.log("[Index] Starting webview initialization...");

    const container = new DIContainer();
    console.log("[Index] Container created");

    await container.init();
    console.log("[Index] Container initialized");

    const controller = new WebviewController(
      container.previewManager,
      container.optionListManager,
      container.keyboardHandler,
    );
    console.log("[Index] Controller created");

    const layout = document.body.dataset.layout;
    if (layout === "classic") {
      new ClassicLayoutResizer();
    } else if (layout === "ivy") {
      new IvyLayoutResizer();
    }

    await controller.initialize();
    console.log("[Index] Controller initialized - Webview ready!");
  } catch (error) {
    console.error("[Index] Fatal error during initialization:", error);
  }
})();
