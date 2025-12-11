import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";

interface PreviewRendererConfig {
  adapter: PreviewRendererType;
}

const GlobalPreviewRendererRegistry: IPreviewRendererAdapter[] = [];

export function PreviewRendererAdapter(config: PreviewRendererConfig) {
  return function <T extends { new (...args: any[]) }>(constructor: T) {
    const castedPrototype = constructor.prototype as IPreviewRendererAdapter;
    castedPrototype.type = config.adapter;

    GlobalPreviewRendererRegistry.push(new constructor());
  };
}

export function getRegisteredPreviewRendererAdapters() {
  return GlobalPreviewRendererRegistry;
}
