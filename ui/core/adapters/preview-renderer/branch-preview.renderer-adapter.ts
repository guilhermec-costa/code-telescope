import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { CommitInfo } from "../../../../shared/exchange/branch-search";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { toInnerHTML } from "../../../utils/html";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";

@PreviewRendererAdapter({
  adapter: "preview.branch",
})
export class BranchPreviewRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;

  async render(previewElement: HTMLElement, data: PreviewData<CommitInfo[]>, theme: string): Promise<void> {
    const allCommits = data.content;

    const searchContainer = document.createElement("div");
    searchContainer.id = "preview-search_container";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "hash/message";
    searchInput.id = "preview-branch_input";

    searchContainer.appendChild(searchInput);
    previewElement.appendChild(searchContainer);

    const listContainer = document.createElement("div");
    listContainer.id = "preview-list_container";

    previewElement.appendChild(listContainer);

    const renderList = (commitsToRender: CommitInfo[]) => {
      listContainer.innerHTML = "";

      if (commitsToRender.length === 0) {
        listContainer.innerHTML =
          '<div style="padding: 2rem; opacity: 0.7; text-align: center;">No commits found.</div>';
        return;
      }

      commitsToRender.forEach((commit, index) => {
        const item = document.createElement("div");
        item.className = "commit-item";

        const headerRow = document.createElement("div");
        headerRow.className = "commit-header";

        const hashSpan = document.createElement("span");
        hashSpan.textContent = commit.hash.substring(0, 7);
        hashSpan.className = "commit-hash";

        const msgSpan = document.createElement("span");
        msgSpan.textContent = commit.message;
        msgSpan.title = commit.message;
        msgSpan.className = "commit-message";

        headerRow.appendChild(hashSpan);
        headerRow.appendChild(msgSpan);

        const metaRow = document.createElement("div");
        metaRow.className = "commit-meta";

        const authorText = document.createElement("span");
        authorText.innerHTML = `${toInnerHTML(commit.author)}`;

        const dateText = document.createElement("span");
        dateText.textContent = new Date(commit.date).toLocaleString();

        metaRow.appendChild(authorText);
        metaRow.appendChild(dateText);

        item.appendChild(headerRow);
        item.appendChild(metaRow);
        listContainer.appendChild(item);
      });
    };

    renderList(allCommits);

    searchInput.addEventListener("input", (e) => {
      const term = (e.target as HTMLInputElement).value.toLowerCase();

      const filtered = allCommits.filter(
        (c) =>
          c.hash.toLowerCase().includes(term) ||
          c.message.toLowerCase().includes(term) ||
          c.author.toLowerCase().includes(term),
      );

      renderList(filtered);
    });
  }
}
