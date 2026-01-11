import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { WorkspaceTaskOption, WorkspaceTasksFinderData } from "../../../../shared/exchange/ws-tasks";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.tasks",
  preview: "preview.codeHighlighted",
})
export class WorkspaceTasksFinderDataAdapter
  implements IFuzzyFinderDataAdapter<WorkspaceTasksFinderData, WorkspaceTaskOption>
{
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

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

  getDisplayText(option: WorkspaceTaskOption): string {
    return `<i class="codicon codicon-${option.codicon} file-icon sk-source-${option.task.source}"></i><span class="file-path">${option.displayText}</span>`;
  }

  getSelectionValue(option: WorkspaceTaskOption): string {
    return option.index.toString();
  }

  filterOption(option: WorkspaceTaskOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    const task = option.task;

    return (
      task.name.toLowerCase().includes(lowerQuery) ||
      task.source.toLowerCase().includes(lowerQuery) ||
      (task.detail?.toLowerCase().includes(lowerQuery) ?? false) ||
      (task.definition.type?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }

  sortFn(x1: WorkspaceTaskOption, x2: WorkspaceTaskOption): number {
    return x1.displayText.localeCompare(x2.displayText);
  }
}
