import { ConfigChangeHandler } from "../../abstractions/config-change-handler";
import { ThemeChangeHandler } from "./handlers/theme-change.handler";

export const CONFIG_CHANGE_HANDLERS: ConfigChangeHandler[] = [new ThemeChangeHandler()];
