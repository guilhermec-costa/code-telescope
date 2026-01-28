import { CustomDataAdapterProxy, SerializedUiConfig } from "../adapters/data/custom.data-adapter";
import { registerFuzzyDataAdapter } from "../decorators/fuzzy-data-adapter.decorator";
import { PreviewRendererAdapterRegistry } from "../registry/preview-adapter.registry";
import { PreviewManager } from "../render/preview-manager";
import { Virtualizer } from "../render/virtualizer";
import { KeyboardHandler } from "./kbd-handler";
import { OptionListManager } from "./option-list-manager";

function readJson<T = unknown>(id: string): T | null {
  const el = document.getElementById(id);
  if (!el) return null;
  return JSON.parse(el.textContent ?? "null");
}

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
      const searchEl = document.getElementById("search") as HTMLInputElement;
      this.optionListManager = new OptionListManager(this.previewManager, searchEl);

      console.log("[DIContainer] Initializing KeyboardHandler");
      this.keyboardHandler = new KeyboardHandler(__KEYBINDINGS_CFG__);

      const serializedCustomAdapter = readJson<SerializedUiConfig>("__CUSTOM_DATA_ADAPTER__");

      if (serializedCustomAdapter) {
        console.log("[DIContainer] Registering custom data adapter:", serializedCustomAdapter.fuzzyAdapterType);

        const customAdapter = new CustomDataAdapterProxy(serializedCustomAdapter);
        registerFuzzyDataAdapter(customAdapter);
      }

      console.log("[DIContainer] All services initialized successfully!");
    } catch (error) {
      console.error("[DIContainer] Initialization failed:", error);
      throw error;
    }
  }
}
