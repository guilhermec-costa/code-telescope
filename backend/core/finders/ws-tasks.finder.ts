import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { TaskData, WorkspaceTasksFinderData } from "../../../shared/exchange/ws-tasks";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider that retrieves all available workspace tasks.
 *
 * Lists tasks from package.json, tasks.json, and other task providers.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.tasks",
  previewRenderer: "preview.codeHighlighted",
})
export class WorkspaceTasksFinder implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  async querySelectableOptions(): Promise<WorkspaceTasksFinderData> {
    const tasks = await this.getAllTasks();

    const { displayTexts, codicons } = tasks.reduce<{ displayTexts: string[]; codicons: string[] }>(
      (acc, task) => {
        const name = task.name.padEnd(40);
        const source = `[${task.source}]`.padEnd(15);
        const detail = task.detail || "";
        const group = task.group ? `(${task.group.id})` : "";

        acc.displayTexts.push(`${name} ${source} ${group} ${detail}`);
        acc.codicons.push(this.getSourceCodicon(task.source));
        return acc;
      },
      { displayTexts: [], codicons: [] },
    );

    return {
      tasks,
      displayTexts,
      codicons,
    };
  }

  async onSelect(selectedIndex: string) {
    const index = parseInt(selectedIndex, 10);
    const tasks = await this.getAllTasks();
    const selected = tasks[index];

    if (!selected) return;

    try {
      const allTasks = await vscode.tasks.fetchTasks();
      const taskToExecute = allTasks.find((t) => t.name === selected.name && t.source === selected.source);

      if (taskToExecute) {
        await vscode.tasks.executeTask(taskToExecute);
        vscode.window.showInformationMessage(`Running task: ${selected.name}`);
      } else {
        vscode.window.showErrorMessage(`Task not found: ${selected.name}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to execute task: ${error}`);
    }
  }

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const index = parseInt(identifier, 10);
    const tasks = await this.getAllTasks();
    const selected = tasks[index];

    if (!selected) {
      return {
        content: {
          path: "",
          text: "No task selected",
          kind: "text",
        },
        language: "plaintext",
      };
    }

    const previewContent = this.generateTaskPreview(selected);

    return {
      content: {
        path: `Task: ${selected.name}`,
        text: previewContent,
        kind: "text",
      },
      language: "json",
    };
  }

  /**
   * Gets all available tasks from all providers
   */
  private async getAllTasks(): Promise<TaskData[]> {
    const allTasks = await vscode.tasks.fetchTasks();
    const taskDataList: TaskData[] = [];

    for (const task of allTasks) {
      taskDataList.push({
        name: task.name,
        source: task.source,
        definition: task.definition,
        scope: task.scope,
        detail: task.detail,
        group: task.group,
        isBackground: task.isBackground,
        presentationOptions: task.presentationOptions,
        runOptions: task.runOptions,
      });
    }

    return taskDataList;
  }

  /**
   * Returns an icon based on the task source
   */
  private getSourceCodicon(source: string): string {
    const lowerSource = source.toLowerCase();

    if (lowerSource === "npm" || lowerSource.includes("npm")) return "package";
    if (lowerSource === "gulp") return "beaker";
    if (lowerSource === "grunt") return "symbol-event";
    if (lowerSource === "workspace") return "gear";
    if (lowerSource === "shell") return "terminal";
    if (lowerSource === "process") return "zap";
    if (lowerSource.includes("yarn")) return "symbol-thread";
    if (lowerSource.includes("make")) return "tools";

    return "list-unordered";
  }

  /**
   * Generates a detailed preview of the task
   */
  private generateTaskPreview(task: TaskData): string {
    const preview: any = {
      name: task.name,
      source: task.source,
      definition: task.definition,
    };

    if (task.detail) {
      preview.detail = task.detail;
    }

    if (task.group) {
      preview.group = task.group.id;
    }

    if (task.isBackground) {
      preview.isBackground = task.isBackground;
    }

    if (task.presentationOptions) {
      preview.presentation = {
        reveal: this.getPresentationReveal(task.presentationOptions.reveal),
        echo: task.presentationOptions.echo,
        focus: task.presentationOptions.focus,
        panel: this.getPresentationPanel(task.presentationOptions.panel),
        showReuseMessage: task.presentationOptions.showReuseMessage,
        clear: task.presentationOptions.clear,
      };
    }

    if (task.scope && typeof task.scope !== "number") {
      preview.workspaceFolder = task.scope.name;
    }

    return JSON.stringify(preview, null, 2);
  }

  /**
   * Converts TaskRevealKind enum to string
   */
  private getPresentationReveal(reveal?: vscode.TaskRevealKind): string {
    if (!reveal) return "default";

    switch (reveal) {
      case vscode.TaskRevealKind.Always:
        return "always";
      case vscode.TaskRevealKind.Silent:
        return "silent";
      case vscode.TaskRevealKind.Never:
        return "never";
      default:
        return "default";
    }
  }

  /**
   * Converts TaskPanelKind enum to string
   */
  private getPresentationPanel(panel?: vscode.TaskPanelKind): string {
    if (!panel) return "default";

    switch (panel) {
      case vscode.TaskPanelKind.Shared:
        return "shared";
      case vscode.TaskPanelKind.Dedicated:
        return "dedicated";
      case vscode.TaskPanelKind.New:
        return "new";
      default:
        return "default";
    }
  }
}
