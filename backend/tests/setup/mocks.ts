import { vi } from "vitest";

vi.mock("html-encoding-sniffer", () => ({}));
vi.mock("@exodus/bytes", () => ({}));

vi.mock("vscode", () => ({
  Uri: {
    file: (path: string) => ({ fsPath: path, path, toString: () => path }),
    joinPath: vi.fn((uri, ...parts) => ({
      fsPath: parts.join("/"),
      path: parts.join("/"),
      toString: () => parts.join("/"),
    })),
    parse: vi.fn((str) => ({ toString: () => str, fsPath: str, path: str, scheme: "file" })),
  },
  Position: vi.fn(
    class {
      constructor(
        public line: number,
        public character: number,
      ) {}
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
    showInformationMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    activeTextEditor: undefined,
    onDidChangeActiveTextEditor: vi.fn(),
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
      return [{ uri: { fsPath: "/workspace", toString: () => "/workspace" } }];
    },
    asRelativePath: vi.fn((path: any) => path.fsPath || path.path || String(path)),
    findFiles: vi.fn(),
    fs: {
      stat: vi.fn(),
      readFile: vi.fn().mockResolvedValue(new TextEncoder().encode("{}")),
      readDirectory: vi.fn(),
      createDirectory: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    onDidChangeConfiguration: vi.fn(),
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn(),
    }),
    openTextDocument: vi.fn(),
  },
  ExtensionContext: class {},
  ExtensionMode: {
    Development: 1,
  },
}));
