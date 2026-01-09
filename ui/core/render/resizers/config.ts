import { LayoutMode } from "../../common/code/state-manager";
import { WebviewToExtensionMessenger } from "../../common/wv-to-extension-messenger";
import { HorizontalLayoutResizer } from "./ivy-layout-resizer";
import { VerticalLayoutResizer } from "./vertical-layout-resizer";

const onVerticalResizeEnd = (leftWidthVw: number, rightWidthVw: number) => {
  WebviewToExtensionMessenger.instance.requestLayoutPropUpdate([
    { property: "leftSideWidthPct", value: leftWidthVw },
    { property: "rightSideWidthPct", value: rightWidthVw },
  ]);
};

const onIvyHorizontalResizeEnd = (heightVh: number) => {
  WebviewToExtensionMessenger.instance.requestLayoutPropUpdate([{ property: "ivyHeightPct", value: heightVh }]);
};

type LayoutInitializer = () => void;

export const resizerInitializers: Record<LayoutMode, LayoutInitializer> = {
  classic: () => {
    new VerticalLayoutResizer({ onResizeEnd: onVerticalResizeEnd }, "results-container");
  },

  ivy: () => {
    new VerticalLayoutResizer({ onResizeEnd: onVerticalResizeEnd }, "search-results");

    new HorizontalLayoutResizer({
      onResizeEnd: onIvyHorizontalResizeEnd,
    });
  },
};
