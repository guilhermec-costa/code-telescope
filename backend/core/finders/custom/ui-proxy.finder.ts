import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { Result } from "../../../../shared/result";
import { serializeFn } from "../../../utils/serialization";

/**
 * UI-side proxy for a custom finder.
 * Validates and exposes UI adapters in a serializable format
 */
export class CustomFinderUiProxy {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;
  dataAdapter!: CustomFinderDefinition["ui"]["dataAdapter"];

  private constructor(def: CustomFinderDefinition) {
    this.fuzzyAdapterType = def.fuzzyAdapterType as any;

    this.dataAdapter = def.ui.dataAdapter;
  }

  /**
   * Factory method that validates a CustomFinderDefinition
   * and returns a safe UI proxy instance.
   */
  static create(def: CustomFinderDefinition): Result<CustomFinderUiProxy> {
    if (!def || typeof def !== "object") {
      return { ok: false, error: "Invalid custom finder definition" };
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

    if (typeof dataAdapter.getSelectionValue !== "function") {
      return { ok: false, error: "ui.dataAdapter.getSelectionValue must be a function" };
    }

    if (typeof dataAdapter.getSearchText !== "function") {
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

  /**
   * Converts the UI proxy into a fully serializable object
   * that can be sent to the webview.
   */
  toSerializableObject() {
    return {
      fuzzyAdapterType: this.fuzzyAdapterType,
      previewAdapterType: this.previewAdapterType,
      dataAdapterType: this.fuzzyAdapterType,
      dataAdapter: {
        parseOptions: serializeFn(this.dataAdapter.parseOptions),
        getSelectionValue: serializeFn(this.dataAdapter.getSelectionValue),
        getSearchText: serializeFn(this.dataAdapter.getSearchText),
        filterOption: this.dataAdapter.filterOption ? serializeFn(this.dataAdapter.filterOption) : undefined,
        getHtmlWrapper: this.dataAdapter.getHtmlWrapper ? serializeFn(this.dataAdapter.getHtmlWrapper) : undefined,
      },
    };
  }
}
