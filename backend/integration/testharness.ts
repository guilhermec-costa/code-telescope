import * as assert from "assert";
import * as vscode from "vscode";
import { FuzzyFinderPanelController } from "../core/presentation/fuzzy-panel.controller";
import { FuzzyFinderAdapterRegistry } from "../core/registry/fuzzy-provider.registry";
import { WebviewMessageHandlerRegistry } from "../core/registry/webview-handler.registry";

export class IntegrationTestHelper {
  /**
   * Waits for a condition to be true within a timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeoutMs: number = 5000,
    checkIntervalMs: number = 100,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await this.sleep(checkIntervalMs);
    }

    throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
  }

  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Checks if a webview panel is active
   */
  static isPanelActive(): boolean {
    return FuzzyFinderPanelController.instance !== undefined;
  }

  static getCurrentProviderType(): string | undefined {
    return FuzzyFinderPanelController.instance?.provider?.fuzzyAdapterType;
  }

  static async disposePanel(): Promise<void> {
    if (FuzzyFinderPanelController.instance) {
      FuzzyFinderPanelController.instance.dispose();
      await this.sleep(100);
    }
  }

  /**
   * Creates a temporary test file
   */
  static async createTestFile(
    workspaceFolder: vscode.WorkspaceFolder,
    relativePath: string,
    content: string,
  ): Promise<vscode.Uri> {
    const uri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
    return uri;
  }

  static async deleteTestFile(uri: vscode.Uri): Promise<void> {
    try {
      await vscode.workspace.fs.delete(uri);
    } catch {}
  }

  /**
   * Opens a file in editor
   */
  static async openFile(uri: vscode.Uri): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument(uri);
    return await vscode.window.showTextDocument(document);
  }

  static getRegisteredProviders(): string[] {
    return FuzzyFinderAdapterRegistry.instance.getRegisteredTypes();
  }

  static getRegisteredHandlers(): string[] {
    const registry = WebviewMessageHandlerRegistry.instance;
    return Array.from((registry as any).adapters?.keys() || []);
  }

  static assertAllProvidersRegistered(expectedProviders: string[]): void {
    const registered = this.getRegisteredProviders();

    for (const provider of expectedProviders) {
      assert.ok(
        registered.includes(provider),
        `Provider ${provider} is not registered. Registered: ${registered.join(", ")}`,
      );
    }
  }

  static assertAllHandlersRegistered(expectedHandlers: string[]): void {
    const registered = this.getRegisteredHandlers();

    for (const handler of expectedHandlers) {
      assert.ok(
        registered.includes(handler),
        `Handler ${handler} is not registered. Registered: ${registered.join(", ")}`,
      );
    }
  }
}
