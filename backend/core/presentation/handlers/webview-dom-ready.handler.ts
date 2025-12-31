import { IWebviewMessageHandler } from "../../abstractions/webview-message-handler";
import { EventManager } from "../../common/events/event-manager";
import { WebviewMessageHandler } from "../../decorators/webview-message-handler.decorator";

@WebviewMessageHandler()
export class WebviewDOMReadyHandler implements IWebviewMessageHandler<"webviewDOMReady"> {
  readonly type = "webviewDOMReady";

  async handle() {
    await EventManager.emitInitialEvents();
  }
}
