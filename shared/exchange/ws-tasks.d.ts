import type {
  RunOptions,
  TaskDefinition,
  TaskGroup,
  TaskPresentationOptions,
  TaskScope,
  WorkspaceFolder,
} from "vscode";

interface TaskData {
  name: string;
  source: string;
  definition: TaskDefinition;
  scope?: TaskScope | WorkspaceFolder;
  detail?: string;
  group?: TaskGroup;
  isBackground?: boolean;
  presentationOptions?: TaskPresentationOptions;
  runOptions?: RunOptions;
}

export interface WorkspaceTasksFinderData {
  tasks: TaskData[];
  displayTexts: string[];
  codicons: string[];
}

export interface WorkspaceTaskOption {
  index: number;
  task: TaskData;
  codicon: string;
  displayText: string;
}
