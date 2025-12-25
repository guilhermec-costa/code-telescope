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
    searchContainer.style.position = "sticky";
    searchContainer.style.top = "-10px";
    searchContainer.style.backgroundColor = "var(--vscode-editor-background)";
    searchContainer.style.zIndex = "10";
    searchContainer.style.border = "1px solid var(--border-color)";
    searchContainer.classList.add("branch-preview-search");

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "hash/message";
    searchInput.style.width = "100%";
    searchInput.style.fontFamily = "var(--vscode-editor-font-family)";
    searchInput.style.padding = "6px 8px";
    searchInput.style.boxSizing = "border-box";
    searchInput.style.background = "transparent";
    searchInput.style.boxShadow = "inset 0 -1px 0 var(--vscode-panel-border)";
    searchInput.style.padding = "4px 0";
    searchInput.style.fontSize = "12px";
    searchInput.style.opacity = "0.9";

    searchContainer.appendChild(searchInput);
    previewElement.appendChild(searchContainer);

    const listContainer = document.createElement("div");
    listContainer.style.display = "flex";
    listContainer.style.flexDirection = "column";
    listContainer.style.gap = "0px";
    listContainer.style.overflowY = "auto";
    listContainer.style.flex = "1";

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

        const isLast = index === commitsToRender.length - 1;
        item.style.borderBottom = isLast ? "none" : "1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.2))";
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.padding = "6px 10px";
        item.style.gap = "2px";

        const headerRow = document.createElement("div");
        headerRow.style.display = "flex";
        headerRow.style.alignItems = "baseline";
        headerRow.style.gap = "8px";

        const hashSpan = document.createElement("span");
        hashSpan.textContent = commit.hash.substring(0, 7);
        hashSpan.style.fontFamily = "var(--vscode-editor-font-family), 'SF Mono', Monaco, monospace";
        hashSpan.style.color = "var(--vscode-descriptionForeground)";
        hashSpan.style.fontSize = "11px";
        hashSpan.style.minWidth = "fit-content";

        const msgSpan = document.createElement("span");
        msgSpan.textContent = commit.message;
        msgSpan.style.whiteSpace = "nowrap";
        msgSpan.style.overflow = "hidden";
        msgSpan.style.textOverflow = "ellipsis";
        msgSpan.title = commit.message;
        msgSpan.style.fontWeight = "400";
        msgSpan.style.fontSize = "13px";

        headerRow.appendChild(hashSpan);
        headerRow.appendChild(msgSpan);

        const metaRow = document.createElement("div");
        metaRow.style.opacity = "0.7";
        metaRow.style.display = "flex";
        metaRow.style.justifyContent = "space-between";
        metaRow.style.fontSize = "11px";
        metaRow.style.opacity = "0.5";

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
