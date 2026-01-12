import * as assert from "assert";
import * as vscode from "vscode";
import { FuzzyFinderPanelController } from "../core/presentation/fuzzy-panel.controller";
import { getCmdId } from "../utils/commands";

suite("Integration", () => {
  test("Extension should be present", async () => {
    const extension = vscode.extensions.getExtension("guichina.code-telescope");
    assert.ok(extension);

    await extension!.activate();
    assert.ok(extension.isActive);
  });

  test("All fuzzy commands should be registered in VS Code", async () => {
    const allCommands = await vscode.commands.getCommands(true);
    const expectedCommands = [
      getCmdId("fuzzy", "file"),
      getCmdId("fuzzy", "branch"),
      getCmdId("fuzzy", "wsText"),
      getCmdId("fuzzy", "recentFiles"),
      getCmdId("fuzzy", "colorschemes"),
      getCmdId("fuzzy", "diagnostics"),
      getCmdId("fuzzy", "tasks"),
      getCmdId("fuzzy", "callHierarchy"),
    ];
    for (const cmdId of expectedCommands) {
      const isRegistered = allCommands.includes(cmdId);
      assert.ok(isRegistered, `Command ${cmdId} is not registered!`);
    }
  });

  test("Fuzzy Finder Commands", () => {
    const testCases = [
      { cmd: getCmdId("fuzzy", "file"), provider: "workspace.files" },
      { cmd: getCmdId("fuzzy", "branch"), provider: "git.branches" },
      { cmd: getCmdId("fuzzy", "wsText"), provider: "workspace.text" },
      { cmd: getCmdId("fuzzy", "wsSymbols"), provider: "workspace.symbols" },
      { cmd: getCmdId("fuzzy", "recentFiles"), provider: "workspace.recentFiles" },
      { cmd: getCmdId("fuzzy", "colorschemes"), provider: "workspace.colorschemes" },
      { cmd: getCmdId("fuzzy", "diagnostics"), provider: "workspace.diagnostics" },
      { cmd: getCmdId("fuzzy", "tasks"), provider: "workspace.tasks" },
      { cmd: getCmdId("fuzzy", "callHierarchy"), provider: "workspace.callHierarchy" },
    ];

    testCases.forEach(({ cmd, provider }) => {
      test(`should register and execute command: ${cmd}`, async () => {
        const allCommands = await vscode.commands.getCommands(true);
        assert.ok(allCommands.includes(cmd), `Comando ${cmd} não está registrado!`);

        await vscode.commands.executeCommand(cmd);

        await new Promise((resolve) => setTimeout(resolve, 500));

        const instance = FuzzyFinderPanelController.instance;

        assert.ok(instance, `O painel não foi criado para o comando ${cmd}`);
      });
    });

    teardown(async () => {
      if (FuzzyFinderPanelController.instance) {
        FuzzyFinderPanelController.instance.dispose();
      }
    });
  });
});
