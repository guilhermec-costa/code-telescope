import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";

type FailedPreviewContent = {
  title?: string;
  message?: string;
  details?: string;
};

@PreviewRendererAdapter({
  adapter: "preview.failed",
})
export class FailedRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;

  async render(previewElement: HTMLElement, data: PreviewData<FailedPreviewContent | string>): Promise<void> {
    previewElement.innerHTML = "";

    const container = document.createElement("div");
    container.className = "preview-failed-container";

    const title = document.createElement("h3");
    title.textContent = "Preview unavailable";

    const message = document.createElement("p");

    let detailsText: string | undefined;

    if (typeof data.content === "string") {
      message.textContent = data.content;
    } else {
      title.textContent = data.content.title ?? "Preview unavailable";
      message.textContent = data.content.message ?? "This item could not be rendered.";

      detailsText = data.content.details;
    }

    container.appendChild(title);
    container.appendChild(message);

    if (detailsText) {
      const details = document.createElement("pre");
      details.className = "preview-failed-details";
      details.textContent = detailsText;
      container.appendChild(details);
    }

    previewElement.appendChild(container);
  }
}
