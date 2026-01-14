import { spawn } from "child_process";
import { EventEmitter } from "events";
import * as fs from "fs/promises";
import { describe, expect, it, vi } from "vitest";
import * as vscode from "vscode";
import { RipgrepFinder } from "../../../core/finders/ws-text-finder/ripgrep-finder";

vi.mock("child_process");
vi.mock("fs/promises");
vi.mock(import("path"), async (original) => {
  const originalModule = await original();
  return {
    default: {
      ...originalModule,
      isAbsolute: vi.fn().mockReturnValue(true),
    },
  };
});

vi.mock("@backend/core/common/config-manager", () => ({
  ExtensionConfigManager: {
    wsTextFinderCfg: {
      maxColumns: 200,
      maxFileSize: "1M",
      excludePatterns: [],
      maxResults: 10,
    },
  },
}));

vi.mock("@backend/core/finders/ws-text-finder/ripgrep-args.builder", () => ({
  RipgrepArgsBuilder: vi.fn(
    class {
      query = vi.fn().mockReturnThis();
      maxColumns = vi.fn().mockReturnThis();
      maxFileSize = vi.fn().mockReturnThis();
      exclude = vi.fn().mockReturnThis();
      withPaths = vi.fn().mockReturnThis();
      build = vi.fn().mockReturnValue(["--json", "test"]);
    },
  ),
}));

vi.mock("@backend/utils/files", () => ({
  getSvgIconUrl: vi.fn(() => "file-icon"),
}));

describe("RipgrepFinder", () => {
  it("detects ripgrep via filesystem", async () => {
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);

    const finder = new RipgrepFinder();

    // wait microtasks from constructor
    await new Promise(process.nextTick);

    expect(finder.ripgrepAvailable).toBe(true);
  });

  it("returns no workspace message when no workspace is open", async () => {
    vi.spyOn(vscode.workspace, "workspaceFolders", "get").mockReturnValueOnce([]);

    const finder = new RipgrepFinder();
    const result = await finder.search("test");

    expect(result.results).toEqual([]);
    expect(result.message).toBe("No workspace open");
  });

  it("returns matches when ripgrep outputs valid json", async () => {
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);

    const { process, stdout } = createSpawnMock();
    vi.mocked(spawn).mockReturnValue(process);

    const finder = new RipgrepFinder();

    const searchPromise = finder.search("hello");

    stdout.emit(
      "data",
      JSON.stringify({
        type: "match",
        data: {
          path: { text: "file.ts" },
          line_number: 10,
          lines: { text: "hello world" },
          submatches: [{ start: 5 }],
        },
      }) + "\n",
    );

    process.emit("close", 0);

    const result = await searchPromise;

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      file: "file.ts",
      line: 10,
      column: 5,
      text: "hello world",
    });
  });

  it("returns no results message when ripgrep finds nothing", async () => {
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);

    const { process } = createSpawnMock();
    vi.mocked(spawn).mockReturnValue(process);

    const finder = new RipgrepFinder();

    const searchPromise = finder.search("nothing");
    process.emit("close", 1);

    const result = await searchPromise;

    expect(result.results).toEqual([]);
    expect(result.message).toBe("No results found");
  });
});

function createSpawnMock() {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const process = new EventEmitter() as any;

  process.stdout = stdout;
  process.stderr = stderr;
  process.kill = vi.fn();
  process.pid = 1234;

  return { process, stdout, stderr };
}
