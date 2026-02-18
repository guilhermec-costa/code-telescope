import * as vscode from "vscode";
import { FromWebviewKindMessage, PreviewData } from "../../../../shared/extension-webview-protocol";
import { Globals } from "../../../globals";
import { IFuzzyFinderProvider } from "../../abstractions/fuzzy-finder.provider";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { BufferChunkStreamer } from "../../buffer-chunk-streamer";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { FuzzyFinderPanelController } from "../fuzzy-panel.controller";
import { WebviewController } from "../webview.controller";

const CONTENT_CHUNK_THRESHOLD_BYTES = 30 * 1024; // 30KB
const LARGE_CONTENT_CHUNK_SIZE = 100 * 1024; // 100KB

@WebviewMessageHandler()
export class PreviewRequestHandler implements IWebviewMessageHandler<"previewRequest"> {
  readonly type = "previewRequest";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "previewRequest" }>, wv: vscode.Webview) {
    const provider = FuzzyFinderPanelController.instance!.provider;
    const { selectedId } = msg.data;

    const previewData = await provider.getPreviewData(selectedId);
    const contentType = previewData.kind;
    const theme = provider.fuzzyAdapterType !== "workspace.colorschemes" ? Globals.USER_THEME : previewData.theme;

    previewData.theme = theme;

    if (contentType === "text") {
      const textContent = previewData.content;
      const isLargeContent = textContent.length > CONTENT_CHUNK_THRESHOLD_BYTES;

      if (isLargeContent && textContent.length > 0) {
        return await this.sendChunkedPreview(provider, previewData, textContent);
      } else {
        return await this.sendFullPreview(provider, previewData, wv);
      }
    }
    await this.sendFullPreview(provider, previewData, wv);
  }

  private async sendChunkedPreview(provider: IFuzzyFinderProvider, previewData: PreviewData, buffer: string) {
    const theme =
      provider.fuzzyAdapterType !== "workspace.colorschemes" ? Globals.USER_THEME : (previewData.theme as string);
    const chunkStreamer = new BufferChunkStreamer(buffer, {
      previewAdapterType: provider.previewAdapterType,
      metadata: previewData.metadata,
      theme,
      language: previewData.language as string,
      chunkSizeBytes: LARGE_CONTENT_CHUNK_SIZE,
    });

    await chunkStreamer.streamConcurrently(4);
  }

  private async sendFullPreview(provider: any, previewData: PreviewData, wv: vscode.Webview) {
    if (provider.fuzzyAdapterType !== "workspace.colorschemes") {
      previewData.theme = Globals.USER_THEME;
    }

    await WebviewController.sendMessage(wv, {
      type: "fullPreviewUpdate",
      previewAdapterType: provider.previewAdapterType,
      data: previewData,
    });
  }
}
