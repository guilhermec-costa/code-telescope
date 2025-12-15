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
    const cfg = this.root.get("panelSetup") as Partial<PanelSetupConfig> | undefined;

    return {
      leftSideWidthPct: cfg?.leftSideWidthPct ?? 50,
      rightSideWidthPct: cfg?.rightSideWidthPct ?? 50,
    };
  }
}
