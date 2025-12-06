import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";

export interface IPreviewAdapter {
  readonly type: PreviewRendererType;

  render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void>;

  clear?(previewElement: HTMLElement): void;
}
