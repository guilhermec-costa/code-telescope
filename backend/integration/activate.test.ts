import * as assert from "assert";
import * as vscode from "vscode";
import { FuzzyFinderPanelController } from "../core/presentation/fuzzy-panel.controller";
import { FuzzyFinderAdapterRegistry } from "../core/registry/fuzzy-provider.registry";
import { getCmdId } from "../utils/commands";
import { IntegrationTestHelper } from "./testharness";

suite("Integration Tests", () => {
  teardown(async () => {
    await IntegrationTestHelper.disposePanel();
  });

  suite("Extension Activation", () => {
    test("Extension should be present and activate", async () => {
      const extension = vscode.extensions.getExtension("guichina.code-telescope");
      assert.ok(extension, "Extension not found");

      await extension!.activate();
      assert.ok(extension.isActive, "Extension failed to activate");
    });

    test("Extension should register all providers", async () => {
      const expectedProviders = [
        "workspace.files",
        "workspace.keybindings",
        "git.branches",
        "workspace.text",
        "workspace.symbols",
        "workspace.recentFiles",
        "workspace.colorschemes",
        "workspace.diagnostics",
        "workspace.tasks",
        "workspace.callHierarchy",
      ];

      IntegrationTestHelper.assertAllProvidersRegistered(expectedProviders);
    });

    test("Extension should register all message handlers", async () => {
      const expectedHandlers = [
        "webviewDOMReady",
        "updateLayoutProp",
        "previewRequest",
        "optionSelected",
        "dynamicSearch",
        "closePanel",
      ];

      IntegrationTestHelper.assertAllHandlersRegistered(expectedHandlers);
    });
  });

  suite("Command Registration", () => {
    test("All fuzzy commands should be registered", async () => {
      const allCommands = await vscode.commands.getCommands(true);
      const expectedCommands = [
        getCmdId("fuzzy", "file"),
        getCmdId("fuzzy", "keybindings"),
        getCmdId("fuzzy", "branch"),
        getCmdId("fuzzy", "wsText"),
        getCmdId("fuzzy", "wsSymbols"),
        getCmdId("fuzzy", "recentFiles"),
        getCmdId("fuzzy", "colorschemes"),
        getCmdId("fuzzy", "diagnostics"),
        getCmdId("fuzzy", "tasks"),
        getCmdId("fuzzy", "callHierarchy"),
        getCmdId("fuzzy", "custom"),
      ];

      for (const cmdId of expectedCommands) {
        assert.ok(allCommands.includes(cmdId), `Command ${cmdId} is not registered`);
      }
    });
  });

  suite("Command Execution", () => {
    const testCases = [
      { cmd: "file", provider: "workspace.files" },
      { cmd: "branch", provider: "git.branches" },
      { cmd: "wsText", provider: "workspace.text" },
      { cmd: "wsSymbols", provider: "workspace.symbols" },
      { cmd: "recentFiles", provider: "workspace.recentFiles" },
      { cmd: "colorschemes", provider: "workspace.colorschemes" },
      { cmd: "diagnostics", provider: "workspace.diagnostics" },
      { cmd: "tasks", provider: "workspace.tasks" },
    ];

    testCases.forEach(({ cmd, provider }) => {
      test(`Should execute ${cmd} command and set ${provider} provider`, async () => {
        await vscode.commands.executeCommand(getCmdId("fuzzy", cmd));

        await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive(), 3000);

        assert.ok(IntegrationTestHelper.isPanelActive(), `Panel not created for command ${cmd}`);

        const currentProvider = IntegrationTestHelper.getCurrentProviderType();
        assert.strictEqual(
          currentProvider,
          provider,
          `Wrong provider set. Expected ${provider}, got ${currentProvider}`,
        );
      });
    });

    test("Should handle sequential command executions", async () => {
      await vscode.commands.executeCommand(getCmdId("fuzzy", "file"));
      await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive());

      assert.strictEqual(IntegrationTestHelper.getCurrentProviderType(), "workspace.files");

      // should reuse panel
      await vscode.commands.executeCommand(getCmdId("fuzzy", "diagnostics"));
      await IntegrationTestHelper.sleep(500);

      assert.strictEqual(IntegrationTestHelper.getCurrentProviderType(), "workspace.diagnostics");
    });

    test("CallHierarchy command should capture editor context", async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        console.log("Skipping test: No workspace folder");
        return;
      }

      const testContent = `
function testFunction() {
  return "test";
}
`;
      const testUri = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "test-call-hierarchy.ts",
        testContent,
      );

      try {
        await IntegrationTestHelper.openFile(testUri);

        await vscode.commands.executeCommand(getCmdId("fuzzy", "callHierarchy"));
        await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive());

        assert.ok(IntegrationTestHelper.isPanelActive(), "Panel not created");
        assert.strictEqual(IntegrationTestHelper.getCurrentProviderType(), "workspace.callHierarchy");
      } finally {
        await IntegrationTestHelper.deleteTestFile(testUri);
      }
    });
  });

  suite("Panel Lifecycle", () => {
    test("Panel should be created on first command", async () => {
      assert.ok(!IntegrationTestHelper.isPanelActive(), "Panel should not exist initially");

      await vscode.commands.executeCommand(getCmdId("fuzzy", "file"));
      await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive());

      assert.ok(IntegrationTestHelper.isPanelActive(), "Panel should be created");
    });

    test("Panel should be reused on subsequent commands", async () => {
      await vscode.commands.executeCommand(getCmdId("fuzzy", "file"));
      await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive());

      const firstInstance = FuzzyFinderPanelController.instance;

      await vscode.commands.executeCommand(getCmdId("fuzzy", "diagnostics"));
      await IntegrationTestHelper.sleep(300);

      const secondInstance = FuzzyFinderPanelController.instance;

      assert.strictEqual(firstInstance, secondInstance, "Panel should be reused, not recreated");
    });

    test("Panel should be disposed when closed", async () => {
      await vscode.commands.executeCommand(getCmdId("fuzzy", "file"));
      await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive());

      await IntegrationTestHelper.disposePanel();
      await IntegrationTestHelper.sleep(200);

      assert.ok(!IntegrationTestHelper.isPanelActive(), "Panel should be disposed");
    });
  });

  suite("Provider Functionality", () => {
    test("WorkspaceFileFinder should return file data", async () => {
      // open webview first
      await vscode.commands.executeCommand(getCmdId("fuzzy", "file"));
      await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive());

      const provider = FuzzyFinderAdapterRegistry.instance.getAdapter("workspace.files");
      assert.ok(provider, "WorkspaceFileFinder not registered");

      const options = await provider.querySelectableOptions();
      assert.ok(options, "querySelectableOptions should return data");

      if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        assert.ok(options.relative.length > 0, "Should find files in workspace");
      }
    });

    test("DiagnosticsFinder should handle no diagnostics gracefully", async () => {
      const provider = FuzzyFinderAdapterRegistry.instance.getAdapter("workspace.diagnostics");
      assert.ok(provider, "DiagnosticsFinder not registered");

      const options = await provider.querySelectableOptions();
      assert.ok(options, "querySelectableOptions should return data even with no diagnostics");
      assert.ok(Array.isArray(options.diagnostics), "Should return array");
    });

    test("ColorSchemesFinder should return themes", async () => {
      const provider = FuzzyFinderAdapterRegistry.instance.getAdapter("workspace.colorschemes");
      assert.ok(provider, "ColorSchemesFinder not registered");

      const options = await provider.querySelectableOptions();
      assert.ok(options.themes.length > 0, "Should have at least one theme");
    });

    test("WorkspaceTasksFinder should return tasks", async () => {
      const provider = FuzzyFinderAdapterRegistry.instance.getAdapter("workspace.tasks");
      assert.ok(provider, "WorkspaceTasksFinder not registered");

      const options = await provider.querySelectableOptions();
      assert.ok(Array.isArray(options.tasks), "Should return tasks array");
    });
  });

  suite("Performance", () => {
    test("File finder should complete within reasonable time", async function () {
      this.timeout(5000);

      await vscode.commands.executeCommand(getCmdId("fuzzy", "file"));
      await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive());

      const provider = FuzzyFinderAdapterRegistry.instance.getAdapter("workspace.files");

      const start = performance.now();
      await provider!.querySelectableOptions();
      const duration = performance.now() - start;

      assert.ok(duration < 3000, `File finder took too long: ${duration}ms`);
    });

    test("Multiple provider switches should be fast", async function () {
      this.timeout(10000);

      const commands = ["file", "diagnostics", "tasks", "colorschemes"];

      const start = performance.now();
      for (const cmd of commands) {
        await vscode.commands.executeCommand(getCmdId("fuzzy", cmd));
        await IntegrationTestHelper.sleep(200);
      }
      const duration = performance.now() - start;

      assert.ok(duration < 5000, `Provider switches took too long: ${duration}ms`);
    });
  });
});
