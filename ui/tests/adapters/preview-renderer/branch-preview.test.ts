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

    expect(container.querySelectorAll("input").length).toBe(1);
    expect(container.textContent).toContain("Initial commit");
    expect(container.textContent).toContain("Fix bug");
  });

  it("filters commits by input", async () => {
    await adapter.render(container, { content: commits }, "dark");

    const input = container.querySelector("input") as HTMLInputElement;

    input.value = "fix";
    input.dispatchEvent(new Event("input"));

    expect(container.textContent).toContain("Fix bug");
    expect(container.textContent).not.toContain("Initial commit");
  });

  it("shows empty state when no results", async () => {
    await adapter.render(container, { content: commits } as any, "dark");

    const input = container.querySelector("input") as HTMLInputElement;

    input.value = "does not exist";
    input.dispatchEvent(new Event("input"));

    expect(container.textContent).toContain("No commits found");
  });
});
