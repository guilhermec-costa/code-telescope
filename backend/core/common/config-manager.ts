import * as vscode from "vscode";
import type { FinderConfig, PanelSetupConfig } from "../../../shared/exchange/extension-config";
import { Globals } from "../../globals";

export class ExtensionConfigManager {
  private static get root() {
    return vscode.workspace.getConfiguration(Globals.EXTENSION_CONFIGURATION_PREFIX);
  }

  static get wsFileFinderCfg(): FinderConfig {
    const { asRelativePath, excludeHidden, excludePatterns, includePatterns, maxResults } = this.root.get(
      "wsFileFinder",
    ) as FinderConfig;

    return {
      excludeHidden,
      includePatterns,
      excludePatterns,
      maxResults,
      asRelativePath,
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
