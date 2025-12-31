import { ConfigChangeHandler } from "../../abstractions/config-change-handler";
import { ThemeChangeHandler } from "./handlers/theme-change.handler";
import { ZoomChangeHandler } from "./handlers/zoom-change.handler";

export const CONFIG_CHANGE_HANDLERS: ConfigChangeHandler[] = [new ThemeChangeHandler(), new ZoomChangeHandler()];
