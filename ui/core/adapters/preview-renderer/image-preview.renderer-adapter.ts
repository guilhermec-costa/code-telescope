import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";

type ImagePreviewContent = {
  buffer: Uint8Array;
  mimeType?: string;
  alt?: string;
  title?: string;
  width?: number | string;
  height?: number | string;
};

@PreviewRendererAdapter({
  adapter: "preview.image",
})
export class ImageRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;

  async render(previewElement: HTMLElement, data: PreviewData<ImagePreviewContent>): Promise<void> {
    previewElement.innerHTML = "";

    const container = document.createElement("div");
    container.className = "preview-image-container";

    const img = document.createElement("img");
    img.className = "preview-image";
    img.loading = "lazy";

    const { buffer, mimeType = "image/png" } = data.content;

    const blob = new Blob([buffer as any], { type: mimeType });
    const objectUrl = URL.createObjectURL(blob);

    img.src = objectUrl;
    img.alt = data.content.alt ?? "";
    img.title = data.content.title ?? "";

    if (data.content.width) {
      img.style.width = typeof data.content.width === "number" ? `${data.content.width}px` : data.content.width;
    }

    if (data.content.height) {
      img.style.height = typeof data.content.height === "number" ? `${data.content.height}px` : data.content.height;
    }

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
    };

    container.appendChild(img);
    previewElement.appendChild(container);

    let scale = 1;

    container.addEventListener("wheel", (e) => {
      if (!e.ctrlKey) return;

      e.preventDefault();

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      scale = Math.min(Math.max(scale + delta, 0.2), 5);

      img.style.transform = `scale(${scale})`;
    });
  }
}
