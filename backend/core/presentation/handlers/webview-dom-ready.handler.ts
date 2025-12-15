import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { VSCodeEventsManager } from "../../common/code-events-manager";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";

@WebviewMessageHandler()
export class WebviewDOMReadyHandler implements IWebviewMessageHandler<"webviewDOMReady"> {
  readonly type = "webviewDOMReady";

  async handle() {
    await VSCodeEventsManager.emitInitialEvents();
  }
}
