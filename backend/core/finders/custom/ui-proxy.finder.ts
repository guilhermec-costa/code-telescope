import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";

export class CustomFinderUiProxy {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  dataAdapter!: CustomFinderDefinition["ui"]["dataAdapter"];
  renderAdapter?: CustomFinderDefinition["ui"]["renderAdapter"];

  private constructor(def: CustomFinderDefinition) {
    this.fuzzyAdapterType = def.fuzzyAdapterType as any;
    this.previewAdapterType = def.previewAdapterType as any;

    this.dataAdapter = def.ui.dataAdapter;
    this.renderAdapter = def.ui.renderAdapter;
  }

  static create(def: CustomFinderDefinition): { ok: true; value: CustomFinderUiProxy } | { ok: false; error: string } {
    if (!def || typeof def !== "object") {
      return { ok: false, error: "Invalid custom finder definition" };
    }

    if (!def.fuzzyAdapterType || !def.previewAdapterType) {
      return { ok: false, error: "Missing fuzzyAdapterType or previewAdapterType" };
    }

    const ui = def.ui as any;
    if (!ui || typeof ui !== "object") {
      return { ok: false, error: "Missing ui implementation" };
    }

    const dataAdapter = ui.dataAdapter as any;
    if (!dataAdapter || typeof dataAdapter !== "object") {
      return { ok: false, error: "Missing ui.dataAdapter implementation" };
    }

    if (typeof dataAdapter.parseOptions !== "function") {
      return { ok: false, error: "ui.dataAdapter.parseOptions must be a function" };
    }

    if (typeof dataAdapter.getDisplayText !== "function") {
      return { ok: false, error: "ui.dataAdapter.getDisplayText must be a function" };
    }

    if (typeof dataAdapter.getSelectionValue !== "function") {
      return { ok: false, error: "ui.dataAdapter.getSelectionValue must be a function" };
    }

    if (dataAdapter.filterOption !== undefined && typeof dataAdapter.filterOption !== "function") {
      return { ok: false, error: "ui.dataAdapter.filterOption must be a function if provided" };
    }

    try {
      return { ok: true, value: new CustomFinderUiProxy(def) };
    } catch {
      return { ok: false, error: "Failed to initialize custom finder UI proxy" };
    }
  }

  private normalizeFn(fn: Function): string {
    const src = fn.toString();

    if (!src.startsWith("function") && !src.startsWith("(")) {
      return "function " + src;
    }

    return src;
  }

  toSerializableObject() {
    return {
      fuzzyAdapterType: this.fuzzyAdapterType,
      previewAdapterType: this.previewAdapterType,
      dataAdapter: {
        parseOptions: this.normalizeFn(this.dataAdapter.parseOptions),
        getDisplayText: this.normalizeFn(this.dataAdapter.getDisplayText),
        getSelectionValue: this.normalizeFn(this.dataAdapter.getSelectionValue),
        filterOption: this.dataAdapter.filterOption ? this.normalizeFn(this.dataAdapter.filterOption) : undefined,
      },
    };
  }
}
