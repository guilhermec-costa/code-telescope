import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";
import { PreviewManager } from "./preview-manager";
import { FinderAdapterRegistry } from "./registries/finder-adapter-registry";
import { PreviewAdapterRegistry } from "./registries/preview-adapter-registry";
import { VSCodeApiService } from "./vscode-api-service";

export class DIContainer {
  vscodeService!: VSCodeApiService;
  previewManager!: PreviewManager;
  optionListManager!: OptionListManager;
  keyboardHandler!: KeyboardHandler;
  adapterRegistry!: FinderAdapterRegistry;

  async init() {
    try {
      console.log("[DIContainer] Initializing VSCodeApiService...");
      this.vscodeService = new VSCodeApiService();

      console.log("[DIContainer] Initializing PreviewAdapterRegistry...");
      const previewAdapterRegistry = new PreviewAdapterRegistry();
      await previewAdapterRegistry.init();
      console.log("[DIContainer] PreviewAdapterRegistry initialized");

      console.log("[DIContainer] Initializing PreviewManager...");
      this.previewManager = new PreviewManager(this.vscodeService, previewAdapterRegistry);

      console.log("[DIContainer] Initializing OptionListManager...");
      this.optionListManager = new OptionListManager(this.previewManager);

      console.log("[DIContainer] Initializing KeyboardHandler...");
      this.keyboardHandler = new KeyboardHandler();

      console.log("[DIContainer] Initializing FinderAdapterRegistry...");
      this.adapterRegistry = new FinderAdapterRegistry();

      console.log("[DIContainer] All services initialized successfully!");
    } catch (error) {
      console.error("[DIContainer] Initialization failed:", error);
      throw error;
    }
  }
}
