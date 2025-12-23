import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { CustomFinderDefinition } from "../../../shared/custom-provider";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { HtmlLoadConfig, IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";

export class CustomFinderProxy implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  constructor(def: CustomFinderDefinition) {
    this.fuzzyAdapterType = def.fuzzyAdapterType as any;
    this.previewAdapterType = def.previewAdapterType as any;

    this.querySelectableOptions = def.backend.querySelectableOptions;
    this.onSelect = async (item: any) => {
      const { data, action } = await def.backend.onSelect(item);
      console.log({ data, action });
    };
    this.getHtmlLoadConfig = def.backend.getHtmlLoadConfig;
    this.getPreviewData = async (identifier: string) => {
      const result = await def.backend.getPreviewData(identifier);
      return {
        content: {
          text: result,
        },
      } as any;
    };
  }

  querySelectableOptions!: () => Promise<any>;
  onSelect!: (item: string) => void | Promise<void>;
  getHtmlLoadConfig!: () => HtmlLoadConfig;
  getPreviewData!: (identifier: string) => Promise<PreviewData>;

  supportsDynamicSearch = false;
}
