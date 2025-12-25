import { vi } from "vitest";

vi.mock("vscode", () => ({
  Uri: {
    file: vi.fn((path: string) => path),
    joinPath: vi.fn((uri, ...parts) => ({ fsPath: parts.join("/") })),
  },
  Position: vi.fn(
    class {
      constructor(line: number, char: number) {
        return { line, character: char };
      }
    },
  ),
  ViewColumn: {},
  Range: vi.fn(
    class {
      constructor(start: any, end: any) {
        return { start, end };
      }
    },
  ),
  TextEditorRevealType: {
    InCenter: 0,
  },
  window: {
    showTextDocument: vi.fn().mockResolvedValue({
      revealRange: vi.fn(),
    }),
    showErrorMessage: vi.fn(),
  },
  env: {
    appRoot: "/app",
  },
  workspace: {
    get workspaceFolders() {
      return [{ uri: { fsPath: "/workspace" } }];
    },
    asRelativePath: vi.fn(),
    findFiles: vi.fn(),
    fs: {
      stat: vi.fn(),
      readFile: vi.fn(),
    },
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn(),
    }),
  },
  ExtensionContext: class {},
}));
