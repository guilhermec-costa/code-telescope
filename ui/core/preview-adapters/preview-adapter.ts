import { PreviewAdapter } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";

export interface IPreviewAdapter {
  readonly type: PreviewAdapter;

  render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void>;

  clear?(previewElement: HTMLElement): void;
}
