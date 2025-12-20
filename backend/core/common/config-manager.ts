import * as vscode from "vscode";
import {
  type PanelSetupConfig,
  type PreviewManagerConfig,
  type WsFileFinderConfig,
  type WsTextFinderConfig,
} from "../../../shared/exchange/extension-config";
import { Globals } from "../../globals";

enum ExtensionCfgSection {
  WS_FILE_FINDER = "wsFileFinder",
  WS_TEXT_FINDER = "wsTextFinder",
  PREVIEW = "preview",
  PANEL_SETUP = "panelSetup",
}

export class ExtensionConfigManager {
  private static get root() {
    return vscode.workspace.getConfiguration(Globals.EXTENSION_CONFIGURATION_PREFIX);
  }

  static get wsFileFinderCfg(): WsFileFinderConfig {
    return this.root.get<WsFileFinderConfig>(ExtensionCfgSection.WS_FILE_FINDER)!;
  }

  static get wsTextFinderCfg(): WsTextFinderConfig {
    return this.root.get<WsTextFinderConfig>(ExtensionCfgSection.WS_TEXT_FINDER)!;
  }

  static get previewManagerCfg(): PreviewManagerConfig {
    return this.root.get<PreviewManagerConfig>(ExtensionCfgSection.PREVIEW)!;
  }

  static get uiPanelCfg(): PanelSetupConfig {
    return this.root.get<PanelSetupConfig>(ExtensionCfgSection.PANEL_SETUP)!;
  }
}
