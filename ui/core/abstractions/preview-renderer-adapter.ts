import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { PreviewData } from "../../../shared/extension-webview-protocol";

/**
 * Defines how a preview renderer should behave inside the webview.
 */
export interface IPreviewRendererAdapter {
  /**
   * Identifies which renderer this adapter represents.
   * Used by the system to route preview requests to the correct adapter.
   */
  type: PreviewRendererType;

  /**
   * Renders the preview content for the given data.
   */
  render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void>;

  /**
   * (Optional) Renders a fallback state when there is no preview data available.
   */
  renderNoPreviewData?(previewElement: HTMLElement): Promise<void>;
}
