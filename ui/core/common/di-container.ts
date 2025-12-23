import { CustomDataAdapterProxy, SerializedUiConfig } from "../adapters/data/custom.data-adapter";
import { registerFuzzyDataAdapter } from "../decorators/fuzzy-data-adapter.decorator";
import { PreviewRendererAdapterRegistry } from "../registry/preview-adapter.registry";
import { PreviewManager } from "../render/preview-manager";
import { Virtualizer } from "../render/virtualizer";
import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";

declare const __USER_CUSTOM_DATA_ADAPTER__: SerializedUiConfig | undefined;

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

      if (__USER_CUSTOM_DATA_ADAPTER__) {
        const customAdapter = new CustomDataAdapterProxy(__USER_CUSTOM_DATA_ADAPTER__);
        registerFuzzyDataAdapter(customAdapter);
      }

      console.log("[DIContainer] All services initialized successfully!");
    } catch (error) {
      console.error("[DIContainer] Initialization failed:", error);
      throw error;
    }
  }
}
