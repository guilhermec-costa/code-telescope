import { beforeEach, describe, expect, it } from "vitest";
import { BranchPreviewRendererAdapter } from "../../../core/adapters/preview-renderer/branch-preview.renderer-adapter";

const commits = [
  {
    hash: "abcdef123456",
    message: "Initial commit",
    fullMessage: "",
    author: "Alice",
    authorEmail: "",
    date: new Date().toISOString(),
    parents: [],
  },
  {
    hash: "123456abcdef",
    message: "Fix bug",
    fullMessage: "",
    author: "Bob",
    authorEmail: "",
    date: new Date().toISOString(),
    parents: [],
  },
];

describe("BranchPreviewRendererAdapter", () => {
  let adapter: BranchPreviewRendererAdapter;
  let container: HTMLElement;

  beforeEach(() => {
    adapter = new BranchPreviewRendererAdapter();
    container = document.createElement("div");
  });

  it("renders commit list", async () => {
    await adapter.render(container, { content: commits }, "dark");

    expect(container.textContent).toContain("Initial commit");
    expect(container.textContent).toContain("Fix bug");
  });
});
