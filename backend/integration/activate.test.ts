import * as assert from "assert";
import * as vscode from "vscode";
import { FuzzyFinderPanelController } from "../core/presentation/fuzzy-panel.controller";
import { getCmdId } from "../utils/commands";

suite("Integration", () => {
  test("Extension should be present", () => {
    const extension = vscode.extensions.getExtension("guichina.code-telescope");
    assert.ok(extension);
  });

  test("All fuzzy commands should be registered in VS Code", async () => {
    const allCommands = await vscode.commands.getCommands(true);
    const expectedCommands = [
      getCmdId("fuzzy", "file"),
      getCmdId("fuzzy", "branch"),
      getCmdId("fuzzy", "wsText"),
      getCmdId("fuzzy", "commits"),
    ];
    for (const cmdId of expectedCommands) {
      const isRegistered = allCommands.includes(cmdId);
      assert.ok(isRegistered, `Command ${cmdId} is not registered!`);
    }
  });

  test("Command 'fuzzy file' should open a webview panel", async () => {
    const cmdId = getCmdId("fuzzy", "file");

    await vscode.commands.executeCommand(cmdId);

    const instance = FuzzyFinderPanelController.instance;
    assert.ok(instance, "Panel was not created after command execution");
    assert.equal(instance.provider.fuzzyAdapterType, "workspace.files");
  });
});
