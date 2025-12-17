import * as vscode from "vscode";
import { FromWebviewKindMessage } from "../../../../shared/extension-webview-protocol";
import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { HighlightContentCache } from "../../common/cache/highlight-content.cache";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";

@WebviewMessageHandler()
export class HighlightCacheHandler implements IWebviewMessageHandler<"highlightCache"> {
  readonly type = "highlightCache";

  async handle(msg: Extract<FromWebviewKindMessage, { type: "highlightCache" }>, wv: vscode.Webview) {
    const { content, path, highlightedLine } = msg.data;
    const cacheKey = highlightedLine !== undefined ? `${path}:${highlightedLine}` : path;
    HighlightContentCache.instance.set(cacheKey, content);
  }
}
