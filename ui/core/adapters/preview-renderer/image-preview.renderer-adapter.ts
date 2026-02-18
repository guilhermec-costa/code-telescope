import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { ImagePreviewData } from "../../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";

@PreviewRendererAdapter({
  adapter: "preview.image",
})
export class ImageRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;

  async render(previewElement: HTMLElement, data: ImagePreviewData): Promise<void> {
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
