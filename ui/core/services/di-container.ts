import { PreviewRendererAdapterRegistry } from "../registry/preview-adapter.registry";
import { PreviewManager } from "../render/preview-manager";
import { Virtualizer } from "../render/virtualizer";
import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";

export class DIContainer {
  previewManager!: PreviewManager;
  optionListManager!: OptionListManager;
  keyboardHandler!: KeyboardHandler;
  virtualizer!: Virtualizer;

  async init() {
    try {
      console.log("[DIContainer] Initializing VSCodeApiService");

      console.log("[DIContainer] Initializing PreviewAdapterRegistry");
      await PreviewRendererAdapterRegistry.instance.init();
      console.log("[DIContainer] PreviewAdapterRegistry initialized");

      console.log("[DIContainer] Initializing PreviewManager");
      this.previewManager = new PreviewManager();

      console.log("[DIContainer] Initializing OptionListManager");
      this.optionListManager = new OptionListManager(this.previewManager);

      console.log("[DIContainer] Initializing KeyboardHandler");
      this.keyboardHandler = new KeyboardHandler();

      console.log("[DIContainer] All services initialized successfully!");
    } catch (error) {
      console.error("[DIContainer] Initialization failed:", error);
      throw error;
    }
  }
}
