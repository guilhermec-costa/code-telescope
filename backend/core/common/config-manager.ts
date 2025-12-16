import * as vscode from "vscode";
import type {
  PanelSetupConfig,
  WsFileFinderConfig,
  WsTextFinderConfig,
} from "../../../shared/exchange/extension-config";
import { Globals } from "../../globals";

export class ExtensionConfigManager {
  private static get root() {
    return vscode.workspace.getConfiguration(Globals.EXTENSION_CONFIGURATION_PREFIX);
  }

  static get wsFileFinderCfg(): WsFileFinderConfig {
    const { asRelativePath, excludeHidden, excludePatterns, includePatterns, maxResults } =
      this.root.get<WsFileFinderConfig>("wsFileFinder")!;

    return {
      excludeHidden,
      includePatterns,
      excludePatterns,
      maxResults,
      asRelativePath,
    };
  }

  static get wsTextFinderCfg(): WsTextFinderConfig {
    const { excludeHidden, excludePatterns, includePatterns, maxResults, maxColumns, maxFileSize } =
      this.root.get<WsTextFinderConfig>("wsTextFinder")!;
    return {
      excludeHidden,
      includePatterns,
      excludePatterns,
      maxResults,
      maxColumns,
      maxFileSize,
    };
  }

  static get uiPanelCfg(): PanelSetupConfig {
    const { leftSideWidthPct, rightSideWidthPct, panelContainerPct } = this.root.get("panelSetup") as PanelSetupConfig;

    return {
      leftSideWidthPct,
      rightSideWidthPct,
      panelContainerPct,
    };
  }
}
