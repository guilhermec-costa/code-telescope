import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { Result } from "../../../../shared/result";
import { serializeFn } from "../../../utils/serialization";

/**
 * UI-side proxy for a custom finder.
 * Validates and exposes UI adapters in a serializable format.
 */
export class CustomFinderUiProxy {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;
  dataAdapter!: CustomFinderDefinition["ui"]["dataAdapter"];

  private constructor(def: CustomFinderDefinition) {
    this.fuzzyAdapterType = def.fuzzyAdapterType;
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

    const ui = def.ui;
    if (!ui || typeof ui !== "object") {
      return { ok: false, error: "Missing ui implementation" };
    }

    const dataAdapter = ui.dataAdapter;
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
      return { ok: false, error: "ui.dataAdapter.getSearchText must be a function" };
    }

    const preset = dataAdapter.htmlWrapperPreset;
    if (preset === "codicon" && typeof dataAdapter.getCodiconName !== "function") {
      return {
        ok: false,
        error: 'ui.dataAdapter.getCodiconName must be a function when htmlWrapperPreset is "codicon"',
      };
    }

    if (!preset && typeof (dataAdapter as any).getHtmlWrapper !== "function") {
      return {
        ok: false,
        error: "ui.dataAdapter.getHtmlWrapper must be a function when no htmlWrapperPreset is provided",
      };
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
    const adapter = this.dataAdapter as any;

    return {
      fuzzyAdapterType: this.fuzzyAdapterType,
      previewAdapterType: this.previewAdapterType,
      dataAdapterType: this.fuzzyAdapterType,
      dataAdapter: {
        parseOptions: serializeFn(this.dataAdapter.parseOptions),
        getSelectionValue: serializeFn(this.dataAdapter.getSelectionValue),
        getSearchText: serializeFn(this.dataAdapter.getSearchText),
        htmlWrapperPreset: adapter.htmlWrapperPreset,
        getHtmlWrapper: adapter.getHtmlWrapper ? serializeFn(adapter.getHtmlWrapper) : undefined,
        getCodiconName: adapter.getCodiconName ? serializeFn(adapter.getCodiconName) : undefined,
      },
    };
  }
}
