import { DIContainer } from "./core/common/di-container";
import { WebviewController } from "./core/common/webview.controller";

import "./core/adapters/data/loader";
import "./core/adapters/preview-renderer/loader";
import { WebviewToExtensionMessenger } from "./core/common/wv-to-extension-messenger";
import { HorizontalLayoutResizer } from "./core/render/resizers/ivy-layout-resizer";
import { VerticalLayoutResizer } from "./core/render/resizers/vertical-layout-resizer";

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

    new VerticalLayoutResizer({
      onResizeEnd: (leftWidthVw, rightWidthVw) => {
        WebviewToExtensionMessenger.instance.requestLayoutPropUpdate([
          { property: "leftSideWidthPct", value: leftWidthVw },
          { property: "rightSideWidthPct", value: rightWidthVw },
        ]);
      },
    });

    const layout = document.body.dataset.layout;
    if (layout === "ivy") {
      new HorizontalLayoutResizer({
        onResizeEnd: (heightVh) => {
          WebviewToExtensionMessenger.instance.requestLayoutPropUpdate([{ property: "ivyHeightPct", value: heightVh }]);
        },
      });
    }

    await controller.initialize();
    console.log("[Index] Controller initialized - Webview ready!");
  } catch (error) {
    console.error("[Index] Fatal error during initialization:", error);
  }
})();
