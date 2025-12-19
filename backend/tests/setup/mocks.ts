import { vi } from "vitest";

vi.mock("vscode", () => ({
  Uri: {
    file: vi.fn((path: string) => path),
  },
}));
