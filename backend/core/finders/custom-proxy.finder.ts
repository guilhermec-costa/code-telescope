import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../shared/custom-provider";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";

export class CustomFinderBackendProxy implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  private constructor(def: CustomFinderDefinition) {
    this.fuzzyAdapterType = def.fuzzyAdapterType as any;
    this.previewAdapterType = def.previewAdapterType as any;

    this.querySelectableOptions = def.backend.querySelectableOptions;
    this.onSelect = async (item: any) => {
      const { data, action } = await def.backend.onSelect(item);
      console.log({ data, action });
    };
    this.getPreviewData = async (identifier: string) => {
      const result = await def.backend.getPreviewData(identifier);
      return {
        content: {
          text: result,
        },
      } as any;
    };
  }

  static create(
    def: CustomFinderDefinition,
  ): { ok: true; value: CustomFinderBackendProxy } | { ok: false; error: string } {
    if (!def || typeof def !== "object") {
      return { ok: false, error: "Invalid custom finder definition" };
    }

    if (!def.fuzzyAdapterType || !def.previewAdapterType) {
      return { ok: false, error: "Missing fuzzyAdapterType or previewAdapterType" };
    }

    const backend = def.backend as any;

    if (!backend || typeof backend !== "object") {
      return { ok: false, error: "Missing backend implementation" };
    }

    if (typeof backend.querySelectableOptions !== "function") {
      return { ok: false, error: "backend.querySelectableOptions must be a function" };
    }

    if (typeof backend.onSelect !== "function") {
      return { ok: false, error: "backend.onSelect must be a function" };
    }

    if (typeof backend.getPreviewData !== "function") {
      return { ok: false, error: "backend.getPreviewData must be a function" };
    }

    try {
      return { ok: true, value: new CustomFinderBackendProxy(def) };
    } catch (err) {
      return { ok: false, error: "Failed to initialize custom finder proxy" };
    }
  }

  querySelectableOptions!: () => Promise<any>;
  onSelect!: (item: string) => void | Promise<void>;
  getHtmlLoadConfig() {
    return {
      fileName: "file-fuzzy.view.html",
      placeholders: {
        "{{style}}": "ui/style/style.css",
        "{{script}}": "ui/dist/index.js",
      },
    };
  }
  getPreviewData!: (identifier: string) => Promise<PreviewData>;

  supportsDynamicSearch = false;
}
