import { IFuzzyFinderDataAdapter } from "../../../../shared/abstractions/fuzzy-finder-data-adapter";
import { DataAdapterType } from "../../../../shared/adapters-namespace";
import { WorkspaceTaskOption, WorkspaceTasksFinderData } from "../../../../shared/exchange/ws-tasks";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  type: "workspaceTasksAdapter",
})
export class WorkspaceTasksFinderDataAdapter
  implements IFuzzyFinderDataAdapter<WorkspaceTasksFinderData, WorkspaceTaskOption>
{
  typeName: DataAdapterType;

  parseOptions(data: WorkspaceTasksFinderData): WorkspaceTaskOption[] {
    const options: WorkspaceTaskOption[] = [];

    for (let i = 0; i < data.tasks.length; i++) {
      options.push({
        index: i,
        task: data.tasks[i],
        codicon: data.codicons[i],
        displayText: data.displayTexts[i],
      });
    }

    return options;
  }

  getSearchText(option: WorkspaceTaskOption): string {
    const task = option.task;
    return `${task.name} [${task.source}]`;
  }

  getHtmlWrapper(option: WorkspaceTaskOption, highlightedContent: string): string {
    return `<i class="codicon codicon-${option.codicon} file-icon sk-source-${option.task.source}"></i><span class="file-path">${highlightedContent}</span>`;
  }

  getSelectionValue(option: WorkspaceTaskOption): string {
    return option.index.toString();
  }

  sortFn(x1: WorkspaceTaskOption, x2: WorkspaceTaskOption): number {
    return x1.displayText.localeCompare(x2.displayText);
  }
}
