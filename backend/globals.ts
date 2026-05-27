import * as vscode from "vscode";

/**
 * Shared global constants and runtime values used by the extension.
 */
export const Globals = {
  /** Extension identifier */
  EXTENSION_NAME: "code-telescope",

  /**
   * Microsoft documentation states that the Application Insights connection string
     is NOT considered sensitive and can be safely hardcoded or stored in source control.
     It is used only to identify the telemetry ingestion endpoint and resource.
   */
  REPORT_CONN_STR:
    "InstrumentationKey=36e3b3c9-3fd6-489e-927e-5843174881b6;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=a37ec5a9-3555-433b-a807-bdde963575e4",

  /** Prefix for extension configuration keys */
  EXTENSION_CONFIGURATION_PREFIX: "codeTelescope",

  /** Prefix used to identify custom workspace providers */
  CUSTOM_PROVIDER_PREFIX: "custom.",

  /** Prefix used to identify external providers */
  EXTERNAL_PROVIDER_PREFIX: "ext.",

  /** Common VS Code command identifiers */
  cmds: {
    openFile: "vscode.open",
    focusActiveFile: "workbench.action.focusActiveEditorGroup",
  } as const,

  /** Common VS Code configuration sections */
  cfgSections: {
    colorTheme: "workbench.colorTheme",
    fontSize: "window.zoomLevel",
  } as const,

  /** Extension mode (resolved at activation) */
  ENV: undefined as unknown as vscode.ExtensionMode,

  /** Extension root URI (resolved at activation) */
  EXTENSION_URI: undefined as unknown as vscode.Uri,

  /** Current user theme */
  USER_THEME: undefined as unknown as string,
};
