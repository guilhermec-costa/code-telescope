import "./mocks";
import { afterEach, beforeAll, vi } from "vitest";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.mock("@backend/core/log", () => {
    return {
      Logger: vi.fn(
        class {
          constructor() {}
        },
      ),
    };
  });
  vi.mock("@backend/core/perf", () => {
    return {
      PerfomanceLogger: vi.fn(
        class {
          constructor() {}
        },
      ),
    };
  });
});

afterEach(() => {
  vi.clearAllMocks();
});
