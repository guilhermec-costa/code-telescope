import { pathToFileURL } from "url";
import * as vscode from "vscode";
import { CustomFinderDefinition } from "../../../../shared/custom-provider";
import { AsyncResult } from "../../../@types/result";
import { FuzzyFinderAdapterRegistry } from "../../registry/fuzzy-provider.registry";
import { CustomProviderStorage } from "./custom-provider.storage";

export class CustomProviderLoader {
  private readonly loadedProviders = new Map<string, string>();
  private watcher?: vscode.FileSystemWatcher;

  constructor(private readonly context: vscode.ExtensionContext) {}

  async initialize(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const glob = new vscode.RelativePattern(workspaceFolders[0], ".vscode/code-telescope/*.finder.cjs");
    const files = await vscode.workspace.findFiles(glob);

    for (const uri of files) {
      await this.loadAndTrack(uri);
    }

    this.watcher = vscode.workspace.createFileSystemWatcher(glob);

    this.watcher.onDidCreate((uri) => this.onCreate(uri));
    this.watcher.onDidChange((uri) => this.onChange(uri));
    this.watcher.onDidDelete((uri) => this.onDelete(uri));

    this.context.subscriptions.push(this.watcher);
  }

  private async loadAndTrack(uri: vscode.Uri): Promise<void> {
    const result = await this.loadCustomProvider(uri);

    if (!result.ok) {
      vscode.window.showErrorMessage(result.error);
      return;
    }

    this.loadedProviders.set(result.value.uri.fsPath, result.value.fuzzyType);
  }

  private async onCreate(uri: vscode.Uri) {
    console.log("[CodeTelescope] Custom provider created:", uri.fsPath);
    await this.loadAndTrack(uri);
  }

  private async onChange(uri: vscode.Uri) {
    console.log("[CodeTelescope] Custom provider changed:", uri.fsPath);
    await this.loadAndTrack(uri);
  }

  private onDelete(uri: vscode.Uri) {
    console.log("[CodeTelescope] Custom provider deleted:", uri.fsPath);

    const fuzzyType = this.loadedProviders.get(uri.fsPath);
    if (!fuzzyType) {
      return;
    }

    CustomProviderStorage.instance.deleteConfig(fuzzyType);
    FuzzyFinderAdapterRegistry.instance.deleteAdapter(fuzzyType);

    this.loadedProviders.delete(uri.fsPath);
  }

  private async loadCustomProvider(fileUri: vscode.Uri): AsyncResult<{ uri: vscode.Uri; fuzzyType: string }> {
    try {
      const filePath = fileUri.fsPath;

      const fileUrl = pathToFileURL(filePath).toString();
      const module = await import(`${fileUrl}?update=${Date.now()}`);
      const userConfig: CustomFinderDefinition = module.default || module;

      CustomProviderStorage.instance.registerConfig(userConfig);

      const backend = CustomProviderStorage.instance.getBackendProxyDefinition(userConfig.fuzzyAdapterType);
      if (!backend.ok) {
        return { ok: false, error: backend.error };
      }

      const ui = CustomProviderStorage.instance.getUiProxyDefinition(userConfig.fuzzyAdapterType);
      if (!ui.ok) {
        return { ok: false, error: ui.error };
      }

      FuzzyFinderAdapterRegistry.instance.register(backend.value);

      return {
        ok: true,
        value: {
          uri: fileUri,
          fuzzyType: backend.value.fuzzyAdapterType,
        },
      };
    } catch (err) {
      console.error(`Failed to load custom finder: ${fileUri.fsPath}`, err);
      return { ok: false, error: "Failed to load custom finder" };
    }
  }

  dispose() {
    this.watcher?.dispose();
    this.loadedProviders.clear();
  }
}
