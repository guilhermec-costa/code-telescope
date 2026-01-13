import * as vscode from "vscode";
import { PerformanceLogger } from "./perf-log";

export class PerformanceDevModule {
  private static activated = false;

  static activate(ctx: vscode.ExtensionContext) {
    if (this.activated) return;
    this.activated = true;

    PerformanceLogger.initialize();
    PerformanceLogger.setEnabled(true);

    this.registerCommands(ctx);
    this.registerDevMenu(ctx);
  }

  private static registerCommands(ctx: vscode.ExtensionContext) {
    ctx.subscriptions.push(
      vscode.commands.registerCommand("code-telescope.performance.showSummary", () => {
        PerformanceLogger.printSummary();
      }),

      vscode.commands.registerCommand("code-telescope.performance.showSlowest", () => {
        const slowest = PerformanceLogger.getSlowestOperations(10);

        if (slowest.length === 0) {
          vscode.window.showInformationMessage("No operations recorded yet");
          return;
        }

        const items = slowest.map((metric, index) => ({
          label: `${index + 1}. ${metric.operation}`,
          description: `${metric.duration.toFixed(2)}ms`,
          detail: `Heap: ${metric.heapUsedBefore}MB → ${metric.heapUsedAfter}MB (${
            metric.heapDelta > 0 ? "+" : ""
          }${metric.heapDelta.toFixed(2)}MB)`,
        }));

        vscode.window.showQuickPick(items, {
          placeHolder: "Slowest Operations",
          title: "Top 10 Slowest Operations",
        });
      }),

      vscode.commands.registerCommand("code-telescope.performance.showHighestMemory", () => {
        const highest = PerformanceLogger.getHighestMemoryOperations(10);

        if (highest.length === 0) {
          vscode.window.showInformationMessage("No operations recorded yet");
          return;
        }

        const items = highest.map((metric, index) => ({
          label: `${index + 1}. ${metric.operation}`,
          description: `${metric.heapDelta > 0 ? "+" : ""}${metric.heapDelta.toFixed(2)}MB`,
          detail: `Duration: ${metric.duration.toFixed(2)}ms | Heap: ${metric.heapUsedBefore}MB → ${metric.heapUsedAfter}MB`,
        }));

        vscode.window.showQuickPick(items, {
          placeHolder: "Highest Memory Usage",
          title: "Top 10 Operations by Memory Impact",
        });
      }),

      vscode.commands.registerCommand("code-telescope.performance.clear", () => {
        PerformanceLogger.clearMetrics();
        vscode.window.showInformationMessage("Performance metrics cleared");
      }),

      vscode.commands.registerCommand("code-telescope.performance.toggle", async () => {
        const config = vscode.workspace.getConfiguration("codeTelescope");
        const current = config.get("performanceLogging", true);
        const newValue = !current;

        await config.update("performanceLogging", newValue, vscode.ConfigurationTarget.Global);
        PerformanceLogger.setEnabled(newValue);

        vscode.window.showInformationMessage(`Performance logging ${newValue ? "enabled" : "disabled"}`);
      }),
    );
  }

  private static registerDevMenu(ctx: vscode.ExtensionContext) {
    ctx.subscriptions.push(
      vscode.commands.registerCommand("_dev.menu", async () => {
        const choice = await vscode.window.showQuickPick(
          [
            { label: "$(pulse) Show Performance Summary", command: "code-telescope.performance.showSummary" },
            { label: "$(watch) Show Slowest Operations", command: "code-telescope.performance.showSlowest" },
            { label: "$(graph) Show Highest Memory", command: "code-telescope.performance.showHighestMemory" },
            { label: "$(trash) Clear Metrics", command: "code-telescope.performance.clear" },
            { label: "$(debug-pause) Toggle Logging", command: "code-telescope.performance.toggle" },
          ],
          {
            placeHolder: "Dev Tools - Performance",
            title: "Code Telescope Developer Tools",
          },
        );

        if (choice) {
          await vscode.commands.executeCommand(choice.command);
        }
      }),
    );

    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBar.text = "$(tools) Dev";
    statusBar.tooltip = "Code Telescope Dev Tools";
    statusBar.command = "_dev.menu";
    statusBar.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
    statusBar.show();

    ctx.subscriptions.push(statusBar);
  }
}
