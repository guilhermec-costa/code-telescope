import * as vscode from "vscode";
import {
  type KeybindingConfig,
  type LayoutSetupConfig,
  type MatchingConfig,
  type PreviewManagerConfig,
  type WsFileFinderConfig,
  type WsTextFinderConfig,
} from "../../../shared/exchange/extension-config";
import { Result } from "../../../shared/result";
import { Globals } from "../../globals";
import { Logger } from "../log";

enum ExtensionCfgSection {
  WS_FILE_FINDER = "wsFileFinder",
  WS_TEXT_FINDER = "wsTextFinder",
  PREVIEW = "preview",
  LAYOUT = "layout",
  KEYBINDINGS = "keybindings",
  MATCHING = "matching",
}

export class ExtensionConfigManager {
  private static get root() {
    return vscode.workspace.getConfiguration(Globals.EXTENSION_CONFIGURATION_PREFIX, null);
  }

  static get wsFileFinderCfg(): WsFileFinderConfig {
    return this.root.get<WsFileFinderConfig>(ExtensionCfgSection.WS_FILE_FINDER)!;
  }

  static get wsTextFinderCfg(): WsTextFinderConfig {
    const config = this.root.get<WsTextFinderConfig>(ExtensionCfgSection.WS_TEXT_FINDER)!;
    const current = this.root.inspect<boolean>(`${ExtensionCfgSection.WS_TEXT_FINDER}.fixedStrings`);
    const hasCurrentOverride = Boolean(
      current?.globalValue !== undefined ||
        current?.workspaceValue !== undefined ||
        current?.workspaceFolderValue !== undefined ||
        current?.globalLanguageValue !== undefined ||
        current?.workspaceLanguageValue !== undefined ||
        current?.workspaceFolderLanguageValue !== undefined,
    );

    if (hasCurrentOverride) return config;

    const legacy = this.root.inspect<boolean>(`${ExtensionCfgSection.WS_FILE_FINDER}.fixedStrings`);
    const legacyValue =
      legacy?.workspaceFolderLanguageValue ??
      legacy?.workspaceLanguageValue ??
      legacy?.globalLanguageValue ??
      legacy?.workspaceFolderValue ??
      legacy?.workspaceValue ??
      legacy?.globalValue;

    return legacyValue === undefined ? config : { ...config, fixedStrings: legacyValue };
  }

  static get previewManagerCfg(): PreviewManagerConfig {
    return this.root.get<PreviewManagerConfig>(ExtensionCfgSection.PREVIEW)!;
  }

  static get layoutCfg(): LayoutSetupConfig {
    return this.root.get<LayoutSetupConfig>(ExtensionCfgSection.LAYOUT)!;
  }

  static async updateLayoutProperty<T = any>(property: string, value: T): Promise<Result<boolean>> {
    try {
      await this.root.update(`${ExtensionCfgSection.LAYOUT}.${property}`, value, vscode.ConfigurationTarget.Global);

      Logger.info(`Layout property updated: ${property}`);
      return {
        ok: true,
        value: true,
      };
    } catch (error) {
      Logger.error(`Failed to update layout property: ${property}`, error as Error);
      return {
        ok: false,
        error: "Failed to updated property",
      };
    }
  }

  static get keybindings(): KeybindingConfig {
    return this.root.get<KeybindingConfig>(ExtensionCfgSection.KEYBINDINGS)!;
  }

  static get matchingCfg(): MatchingConfig {
    return this.root.get<MatchingConfig>(ExtensionCfgSection.MATCHING)!;
  }
}
