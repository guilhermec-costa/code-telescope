import { DIContainer } from "./core/common/di-container";
import { WebviewController } from "./core/common/webview.controller";

import "./core/adapters/data/loader";
import "./core/adapters/preview-renderer/loader";
import { HorizontalSplitter } from "./core/render/horizontal-splitter";

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

    new HorizontalSplitter(
      document.getElementById("split")!,
      document.getElementById("left-side")!,
      document.getElementById("resizer")!,
      {
        minLeftWidth: 250,
        maxLeftWidth: 900,
        // onResizeEnd: (width) => StateManager.setLeftPaneWidth(width),
      },
    );

    await controller.initialize();
    console.log("[Index] Controller initialized - Webview ready!");
  } catch (error) {
    console.error("[Index] Fatal error during initialization:", error);
  }
})();
