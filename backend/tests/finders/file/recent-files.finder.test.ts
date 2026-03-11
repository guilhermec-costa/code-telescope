import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileReader } from "../../../core/common/file-reader";
import { RecentFilesFinder } from "../../../core/finders/file/recent-files.finder";
import { execCmd } from "../../../utils/commands";

vi.mock("@backend/utils/files", () => ({
  getSvgIconUrl: vi.fn().mockReturnValue("svg://file"),
}));

vi.mock("@backend/core/common/file-reader", () => ({
  FileReader: {
    read: vi.fn().mockResolvedValue("file content"),
  },
}));

vi.mock("@backend/utils/commands", () => ({
  execCmd: vi.fn(),
}));

describe("RecentFilesFinder", () => {
  let finder: RecentFilesFinder;

  beforeEach(() => {
    vi.clearAllMocks();
    finder = new RecentFilesFinder();
  });

  describe("onSelect", () => {
    it("should execute openFile command", async () => {
      await finder.onSelect("/workspace/src/index.ts");

      expect(execCmd).toHaveBeenCalled();
    });
  });

  describe("getPreviewData", () => {
    it("should return text preview data", async () => {
      vi.mocked(FileReader.read).mockResolvedValue("console.log('test')");

      const result = await finder.getPreviewData("/workspace/src/index.ts");

      expect(result.kind).toBe("text");
      expect(result.content).toBe("console.log('test')");
    });
  });
});
