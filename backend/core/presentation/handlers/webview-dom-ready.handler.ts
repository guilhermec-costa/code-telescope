import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";
import { VSCodeEventsManager } from "../../services/code-events.service";

@WebviewMessageHandler()
export class WebviewDOMReadyHandler implements IWebviewMessageHandler<"webviewDOMReady"> {
  readonly type = "webviewDOMReady";

  async handle() {
    await VSCodeEventsManager.emitInitialEvents();
  }
}
