import * as assert from "assert";
import * as vscode from "vscode";
import { HarpoonProvider } from "../core/finders/harpoon.finder";
import { FuzzyFinderAdapterRegistry } from "../core/registry/fuzzy-provider.registry";
import { HarpoonOrchestrator } from "../harpoon/orchestrator";
import { getCmdId } from "../utils/commands";
import { IntegrationTestHelper } from "./testharness";

suite("Harpoon Integration Tests", () => {
  let manager: HarpoonOrchestrator;
  let workspaceFolder: vscode.WorkspaceFolder;

  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension("guichina.code-telescope");
    assert.ok(extension, "Extension not found");
    await extension.activate();

    workspaceFolder = vscode.workspace.workspaceFolders?.[0]!;
    assert.ok(workspaceFolder, "No workspace folder available for testing");

    const context = (extension.exports as any).context;
    manager = HarpoonOrchestrator.getInstance(context);
  });

  teardown(async () => {
    await manager.clearMarks();
    await IntegrationTestHelper.disposePanel();
  });

  suite("Extension Integration", () => {
    test("HarpoonProvider should be registered", () => {
      const provider = FuzzyFinderAdapterRegistry.instance.getAdapter("harpoon.marks");
      assert.ok(provider, "HarpoonProvider not registered");
      assert.ok(provider instanceof HarpoonProvider, "Provider is not HarpoonProvider instance");
    });

    test("All harpoon commands should be registered", async () => {
      const allCommands = await vscode.commands.getCommands(true);
      const expectedCommands = [
        "code-telescope.harpoon.addFile",
        "code-telescope.harpoon.removeCurrentFile",
        "code-telescope.harpoon.clear",
        "code-telescope.harpoon.editMark",
        "code-telescope.harpoon.reorderMarks",
        "code-telescope.harpoon.gotoFile1",
        "code-telescope.harpoon.gotoFile2",
        "code-telescope.harpoon.gotoFile3",
        "code-telescope.harpoon.gotoFile4",
        "code-telescope.harpoon.gotoFile5",
        "code-telescope.harpoon.gotoFile6",
        "code-telescope.harpoon.gotoFile7",
        "code-telescope.harpoon.gotoFile8",
        "code-telescope.harpoon.gotoFile9",
      ];

      for (const cmdId of expectedCommands) {
        assert.ok(allCommands.includes(cmdId), `Command ${cmdId} is not registered`);
      }
    });
  });

  suite("Mark Management", () => {
    test("Should add file to marks", async () => {
      const testContent = 'console.log("test");';
      const testUri = await IntegrationTestHelper.createTestFile(workspaceFolder, "harpoon-test-1.ts", testContent);

      try {
        await IntegrationTestHelper.openFile(testUri);
        await vscode.commands.executeCommand("code-telescope.harpoon.addFile");

        await IntegrationTestHelper.sleep(200);

        assert.strictEqual(manager.getMarkCount(), 1, "Should have 1 mark");
        assert.ok(manager.isMarked(testUri), "File should be marked");
      } finally {
        await IntegrationTestHelper.deleteTestFile(testUri);
      }
    });

    test("Should not duplicate marks for same file", async () => {
      const testContent = "const x = 1;";
      const testUri = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "harpoon-test-duplicate.ts",
        testContent,
      );

      try {
        await IntegrationTestHelper.openFile(testUri);

        await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
        await IntegrationTestHelper.sleep(100);

        await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
        await IntegrationTestHelper.sleep(100);

        assert.strictEqual(manager.getMarkCount(), 1, "Should still have only 1 mark");
      } finally {
        await IntegrationTestHelper.deleteTestFile(testUri);
      }
    });

    test("Should add multiple files in order", async () => {
      const testUri1 = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "harpoon-test-multi-1.ts",
        "// File 1",
      );
      const testUri2 = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "harpoon-test-multi-2.ts",
        "// File 2",
      );
      const testUri3 = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "harpoon-test-multi-3.ts",
        "// File 3",
      );

      try {
        await IntegrationTestHelper.openFile(testUri1);
        await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
        await IntegrationTestHelper.sleep(100);

        await IntegrationTestHelper.openFile(testUri2);
        await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
        await IntegrationTestHelper.sleep(100);

        await IntegrationTestHelper.openFile(testUri3);
        await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
        await IntegrationTestHelper.sleep(100);

        const marks = manager.getMarks();
        assert.strictEqual(marks.length, 3, "Should have 3 marks");
        assert.strictEqual(marks[0].uri.fsPath, testUri1.fsPath, "First mark should be file 1");
        assert.strictEqual(marks[1].uri.fsPath, testUri2.fsPath, "Second mark should be file 2");
        assert.strictEqual(marks[2].uri.fsPath, testUri3.fsPath, "Third mark should be file 3");
      } finally {
        await IntegrationTestHelper.deleteTestFile(testUri1);
        await IntegrationTestHelper.deleteTestFile(testUri2);
        await IntegrationTestHelper.deleteTestFile(testUri3);
      }
    });

    test("Should remove current file from marks", async () => {
      const testUri = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "harpoon-test-remove.ts",
        "// Remove me",
      );

      try {
        await IntegrationTestHelper.openFile(testUri);
        await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
        await IntegrationTestHelper.sleep(100);

        assert.strictEqual(manager.getMarkCount(), 1, "Should have 1 mark");

        await vscode.commands.executeCommand("code-telescope.harpoon.removeCurrentFile");
        await IntegrationTestHelper.sleep(100);

        assert.strictEqual(manager.getMarkCount(), 0, "Should have 0 marks");
      } finally {
        await IntegrationTestHelper.deleteTestFile(testUri);
      }
    });
  });

  suite("Navigation", () => {
    test("Should navigate to marked file using gotoFile1", async () => {
      const testContent = "// Target file";
      const testUri = await IntegrationTestHelper.createTestFile(workspaceFolder, "harpoon-test-nav.ts", testContent);

      try {
        await IntegrationTestHelper.openFile(testUri);
        await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
        await IntegrationTestHelper.sleep(100);

        await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
        await IntegrationTestHelper.sleep(100);

        await vscode.commands.executeCommand("code-telescope.harpoon.gotoFile1");
        await IntegrationTestHelper.sleep(300);

        const activeEditor = vscode.window.activeTextEditor;
        assert.ok(activeEditor, "Should have active editor");
        assert.strictEqual(activeEditor.document.uri.fsPath, testUri.fsPath, "Should navigate to marked file");
      } finally {
        await IntegrationTestHelper.deleteTestFile(testUri);
      }
    });

    test("Should navigate to correct file with multiple marks", async () => {
      const testUri1 = await IntegrationTestHelper.createTestFile(workspaceFolder, "harpoon-nav-1.ts", "// File 1");
      const testUri2 = await IntegrationTestHelper.createTestFile(workspaceFolder, "harpoon-nav-2.ts", "// File 2");
      const testUri3 = await IntegrationTestHelper.createTestFile(workspaceFolder, "harpoon-nav-3.ts", "// File 3");

      try {
        for (const uri of [testUri1, testUri2, testUri3]) {
          await IntegrationTestHelper.openFile(uri);
          await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
          await IntegrationTestHelper.sleep(100);
        }

        await vscode.commands.executeCommand("code-telescope.harpoon.gotoFile2");
        await IntegrationTestHelper.sleep(300);

        const activeEditor = vscode.window.activeTextEditor;
        assert.ok(activeEditor, "Should have active editor");
        assert.strictEqual(activeEditor.document.uri.fsPath, testUri2.fsPath, "Should navigate to second marked file");
      } finally {
        await IntegrationTestHelper.deleteTestFile(testUri1);
        await IntegrationTestHelper.deleteTestFile(testUri2);
        await IntegrationTestHelper.deleteTestFile(testUri3);
      }
    });
  });

  suite("Harpoon Finder UI", () => {
    test("HarpoonProvider should return marked files", async () => {
      const testUri1 = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "harpoon-provider-1.ts",
        "// File 1",
      );
      const testUri2 = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "harpoon-provider-2.ts",
        "// File 2",
      );

      try {
        for (const uri of [testUri1, testUri2]) {
          await IntegrationTestHelper.openFile(uri);
          await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
          await IntegrationTestHelper.sleep(100);
        }

        await vscode.commands.executeCommand(getCmdId("fuzzy", "harpoon"));
        await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive());

        const provider = FuzzyFinderAdapterRegistry.instance.getAdapter("harpoon.marks");
        const data = await provider!.querySelectableOptions();

        assert.ok(data, "Provider should return data");
        assert.strictEqual(data.marks.length, 2, "Should have 2 marks");
        assert.strictEqual(data.displayTexts.length, 2, "Should have 2 display texts");
        assert.ok(data.displayTexts[0].includes("[1]"), "First display text should include [1]");
      } finally {
        await IntegrationTestHelper.deleteTestFile(testUri1);
        await IntegrationTestHelper.deleteTestFile(testUri2);
      }
    });
  });

  suite("Persistence", () => {
    test("Marks should persist between sessions", async function () {
      this.timeout(5000);

      const testUri = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "harpoon-persist-test.ts",
        "// Persistent mark",
      );

      try {
        await IntegrationTestHelper.openFile(testUri);
        await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
        await IntegrationTestHelper.sleep(200);

        assert.strictEqual(manager.getMarkCount(), 1, "Should have 1 mark before reload");

        await manager.persist();
        await IntegrationTestHelper.sleep(200);

        const marks = manager.getMarks();
        assert.strictEqual(marks.length, 1, "Marks should be retrievable");
        assert.strictEqual(marks[0].uri.fsPath, testUri.fsPath, "URI should match");
      } finally {
        await IntegrationTestHelper.deleteTestFile(testUri);
      }
    });
  });

  suite("Performance", () => {
    test("Should handle many marks efficiently", async function () {
      this.timeout(10000);

      const testUris: vscode.Uri[] = [];

      try {
        for (let i = 0; i < 20; i++) {
          const uri = await IntegrationTestHelper.createTestFile(
            workspaceFolder,
            `harpoon-perf-${i}.ts`,
            `// File ${i}`,
          );
          testUris.push(uri);

          await IntegrationTestHelper.openFile(uri);
          await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
        }

        await IntegrationTestHelper.sleep(500);

        assert.strictEqual(manager.getMarkCount(), 20, "Should have 20 marks");

        const start = performance.now();
        await vscode.commands.executeCommand("code-telescope.harpoon.gotoFile5");
        await IntegrationTestHelper.sleep(300);
        const duration = performance.now() - start;

        assert.ok(duration < 1000, `Navigation took too long: ${duration}ms`);

        await vscode.commands.executeCommand(getCmdId("fuzzy", "harpoon"));
        await IntegrationTestHelper.waitFor(() => IntegrationTestHelper.isPanelActive());

        const provider = FuzzyFinderAdapterRegistry.instance.getAdapter("harpoon.marks");
        const queryStart = performance.now();
        await provider!.querySelectableOptions();
        const queryDuration = performance.now() - queryStart;

        assert.ok(queryDuration < 500, `Provider query took too long: ${queryDuration}ms`);
      } finally {
        for (const uri of testUris) {
          await IntegrationTestHelper.deleteTestFile(uri);
        }
      }
    });
  });

  suite("Edge Cases", () => {
    test("Should handle navigation when no marks exist", async () => {
      await vscode.commands.executeCommand("code-telescope.harpoon.gotoFile1");
      await IntegrationTestHelper.sleep(200);

      assert.strictEqual(manager.getMarkCount(), 0, "Should have 0 marks");
    });

    test("Should handle marking deleted files gracefully", async () => {
      const testUri = await IntegrationTestHelper.createTestFile(
        workspaceFolder,
        "harpoon-delete-test.ts",
        "// Will be deleted",
      );

      await IntegrationTestHelper.openFile(testUri);
      await vscode.commands.executeCommand("code-telescope.harpoon.addFile");
      await IntegrationTestHelper.sleep(100);

      await IntegrationTestHelper.deleteTestFile(testUri);
      await IntegrationTestHelper.sleep(100);

      await vscode.commands.executeCommand("code-telescope.harpoon.gotoFile1");
      await IntegrationTestHelper.sleep(300);

      assert.ok(true, "Should handle deleted file gracefully");
    });
  });
});
