import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CommitInfo } from "../../../../shared/exchange/branch-search";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { toInnerHTML } from "../../../utils/html";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}

function parseCommitType(message: string): { type: string | null; rest: string } {
  const match = message.match(/^(\w+)(?:\([^)]+\))?!?:\s*(.+)$/);
  if (match) return { type: match[1], rest: match[2] };
  return { type: null, rest: message };
}

@PreviewRendererAdapter({
  adapter: "preview.branch",
})
export class BranchPreviewRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;

  async render(previewElement: HTMLElement, data: PreviewData<CommitInfo[]>): Promise<void> {
    const allCommits = data.content as CommitInfo[];

    previewElement.innerHTML = "";

    const container = document.createElement("div");
    container.className = "tl-container";
    previewElement.appendChild(container);

    if (allCommits.length === 0) {
      container.innerHTML = `<div class="tl-empty">No commits found.</div>`;
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const commit of allCommits) {
      const { type, rest } = parseCommitType(commit.message);

      const row = document.createElement("div");
      row.className = "tl-row";

      const hash = document.createElement("span");
      hash.className = "tl-hash";
      hash.textContent = commit.hash.substring(0, 7);

      const msg = document.createElement("span");
      msg.className = "tl-message";
      msg.title = commit.message;
      if (type) {
        msg.innerHTML = `<span class="tl-type">${toInnerHTML(type)}:</span>${toInnerHTML(rest)}`;
      } else {
        msg.textContent = rest;
      }

      const right = document.createElement("div");
      right.className = "tl-right";

      const author = document.createElement("span");
      author.className = "tl-author";
      author.textContent = commit.author;
      author.title = commit.author;

      const date = document.createElement("span");
      date.className = "tl-date";
      date.textContent = formatRelativeDate(commit.date);
      date.title = new Date(commit.date).toLocaleString();

      right.appendChild(author);
      right.appendChild(date);

      row.appendChild(hash);
      row.appendChild(msg);
      row.appendChild(right);

      fragment.appendChild(row);
    }

    container.appendChild(fragment);
  }

  cleanup(): void {}
}
