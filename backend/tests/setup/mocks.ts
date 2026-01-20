import { vi } from "vitest";

vi.mock("html-encoding-sniffer", () => ({}));
vi.mock("@exodus/bytes", () => ({}));

vi.mock("vscode", () => ({
  Uri: {
    file: (path: string) => ({ fsPath: path }),
    joinPath: vi.fn((uri, ...parts) => ({ fsPath: parts.join("/") })),
  },
  Position: vi.fn(
    class {
      constructor(line: number, char: number) {
        return { line, character: char };
      }
    },
  ),
  RelativePattern: vi.fn(
    class {
      constructor(base: string, pattern: string) {}
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
  FileType: {
    File: 1,
  },
  workspace: {
    createFileSystemWatcher: vi.fn(),
    get workspaceFolders() {
      return [{ uri: { fsPath: "/workspace" } }];
    },
    asRelativePath: vi.fn(),
    findFiles: vi.fn(),
    fs: {
      stat: vi.fn(),
      readFile: vi.fn(),
      readDirectory: vi.fn(),
    },
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn(),
    }),
  },
  ExtensionContext: class {},
  ExtensionMode: {
    Development: 1,
  },
}));
