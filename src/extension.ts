import * as vscode from "vscode";

const extensionName = "code-telescope";

function getCmdId(cmdName: string) {
  return `${extensionName}.${cmdName}`;
}

export function activate(context: vscode.ExtensionContext) {
  console.log(`${extensionName} activated!`);
  const disposable = vscode.commands.registerCommand(getCmdId("helloWorld"), () => {
    vscode.window.showInformationMessage("Hello World from code-telescope!!");
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
