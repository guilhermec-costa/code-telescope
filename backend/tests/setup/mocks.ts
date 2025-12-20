import { vi } from "vitest";

vi.mock("vscode", () => ({
  Uri: {
    file: vi.fn((path: string) => path),
  },
  Position: vi.fn(
    class {
      constructor(line: number, char: number) {
        return { line, character: char };
      }
    },
  ),
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
  },
}));
