import type { CodeTelescopeAPI, FinderRegistration } from "code-telescope";
import * as vscode from "vscode";

export async function activate(ctx: vscode.ExtensionContext) {
  console.log("Starting sandbox environment");
  const telescopeExt = vscode.extensions.getExtension<CodeTelescopeAPI>("guichina.code-telescope");

  if (!telescopeExt) {
    vscode.window.showErrorMessage("[Sandbox] Code Telescope not found. Make sure it is installed and enabled.");
    return;
  }

  const api = await telescopeExt.activate();

  console.log(`[Sandbox] Registered finders: ${api.getRegisteredFinders().join(", ")}`);

  const registration: FinderRegistration<string[], string> = {
    provider: {
      fuzzyAdapterType: "ext.sandbox.workspaceFolders",
      previewAdapterType: "preview.buffer",
      dataAdapterType: "ext.sandbox.workspaceFolders",

      async querySelectableOptions(): Promise<string[]> {
        return (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
      },

      async onSelect(path: string): Promise<void> {
        const uri = vscode.Uri.file(path);
        await vscode.commands.executeCommand("vscode.openFolder", uri, { forceNewWindow: false });
      },

      async getPreviewData(path: string) {
        return {
          kind: "text" as const,
          content: `Workspace folder:\n\n${path}`,
          language: "plaintext",
        };
      },
    },

    dataAdapter: {
      typeName: "ext.sandbox.workspaceFolders",
      htmlWrapperPreset: "codicon",

      getCodiconName(option) {
        return "folder";
      },

      parseOptions(data: string[]): string[] {
        return data;
      },

      getSearchText(option: string): string {
        return option;
      },

      getSelectionValue(option: string): string {
        return option;
      },
    },
  };

  const disposable = api.registerFinder(registration);
  ctx.subscriptions.push(disposable);

  console.log(`[Sandbox] Registered finder: ext.sandbox.workspaceFolders`);
  console.log(`[Sandbox] External finders: ${api.getExternalFinders().join(", ")}`);

  ctx.subscriptions.push(
    vscode.commands.registerCommand("sandbox.openWorkspaceFolders", () => {
      api.openFinder("ext.sandbox.workspaceFolders");
    }),
  );
}

export function deactivate() {}
