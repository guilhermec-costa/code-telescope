import { FuzzyAdapter } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";

export interface IPreviewAdapter {
  readonly type: FuzzyAdapter;

  render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void>;

  clear?(previewElement: HTMLElement): void;
}

export interface PreviewUpdateMessage {
  type: "previewUpdate";
  finderType: FuzzyAdapter;
  data: PreviewData;
  theme: string;
}
