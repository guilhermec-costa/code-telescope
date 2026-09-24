import { vi } from "vitest";

vi.mock("html-encoding-sniffer", () => ({}));
vi.mock("@exodus/bytes", () => ({}));

vi.mock("vscode", () => {
  class Uri {
    static file = vi.fn((path: string) => new Uri(path));
    static joinPath = vi.fn((_uri: Uri, ...parts: string[]) => new Uri(parts.join("/")));
    static parse = vi.fn((value: string) => new Uri(value));

    readonly scheme = "file";

    constructor(
      readonly fsPath: string,
      readonly path: string = fsPath,
    ) {}

    toString() {
      return this.path;
    }
  }

  return {
    Uri,
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
      tabGroups: {
        all: [],
      },
      terminals: [],
    },
    env: {
      appRoot: "/app",
      openExternal: vi.fn(),
      clipboard: {
        writeText: vi.fn(),
      },
    },
    FileType: {
      File: 1,
    },
    workspace: {
      isTrusted: true,
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
    commands: {
      executeCommand: vi.fn(),
    },
    TabInputTerminal: vi.fn(
      class {
        constructor() {}
      },
    ),
    ExtensionContext: class {},
    ExtensionMode: {
      Development: 1,
    },
  };
});
