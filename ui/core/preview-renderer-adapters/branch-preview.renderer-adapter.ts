import { PreviewRendererType } from "../../../shared/adapters-namespace";
import { CommitInfo } from "../../../shared/exchange/branch-search";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { toInnerHTML } from "../../utils/html";
import { IPreviewRendererAdapter } from "../abstractions/preview-renderer-adapter";
import { SyntaxHighlighter } from "../registries/preview-adapter.registry";

export class BranchPreviewRendererAdapter implements IPreviewRendererAdapter {
  readonly type: PreviewRendererType = "preview.branch";

  constructor(private readonly highlighter?: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: PreviewData<CommitInfo[]>, theme: string): Promise<void> {
    const allCommits = data.content;

    const searchContainer = document.createElement("div");
    searchContainer.style.padding = "10px 10px";
    searchContainer.style.position = "sticky";
    searchContainer.style.top = "-5px";
    searchContainer.style.backgroundColor = "var(--vscode-editor-background)";
    searchContainer.style.zIndex = "10";
    searchContainer.style.borderBottom = "1px solid var(--vscode-panel-border)";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Filtrar por hash ou mensagem...";
    searchInput.style.width = "100%";
    searchInput.style.fontFamily = "var(--vscode-editor-font-family)";
    searchInput.style.padding = "6px 8px";
    searchInput.style.boxSizing = "border-box";
    searchInput.style.border = "1px solid var(--vscode-input-border, #ccc)";
    searchInput.style.backgroundColor = "var(--vscode-input-background, #fff)";
    searchInput.style.color = "var(--vscode-input-foreground, #000)";
    searchInput.style.outline = "none";
    searchInput.style.fontSize = "13px";

    searchInput.addEventListener("focus", () => {
      searchInput.style.borderColor = "var(--vscode-focusBorder, #007fd4)";
    });
    searchInput.addEventListener("blur", () => {
      searchInput.style.borderColor = "var(--vscode-input-border, #ccc)";
    });

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
          '<div style="padding: 2rem; opacity: 0.7; text-align: center;">Nenhum commit encontrado.</div>';
        return;
      }

      commitsToRender.forEach((commit, index) => {
        const item = document.createElement("div");

        const isLast = index === commitsToRender.length - 1;
        item.style.padding = "12px 10px";
        item.style.borderBottom = isLast ? "none" : "1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.2))";
        item.style.display = "flex";
        item.style.flexDirection = "column";
        item.style.gap = "4px";

        const headerRow = document.createElement("div");
        headerRow.style.display = "flex";
        headerRow.style.alignItems = "baseline";
        headerRow.style.gap = "8px";

        const hashSpan = document.createElement("span");
        hashSpan.textContent = commit.hash.substring(0, 7);
        hashSpan.style.fontFamily = "var(--vscode-editor-font-family), 'SF Mono', Monaco, monospace";
        hashSpan.style.fontSize = "0.9em";
        hashSpan.style.color = "var(--vscode-textLink-foreground, #3794ff)";
        hashSpan.style.minWidth = "fit-content";

        const msgSpan = document.createElement("span");
        msgSpan.textContent = commit.message;
        msgSpan.style.fontWeight = "600";
        msgSpan.style.whiteSpace = "nowrap";
        msgSpan.style.overflow = "hidden";
        msgSpan.style.textOverflow = "ellipsis";
        msgSpan.title = commit.message;

        headerRow.appendChild(hashSpan);
        headerRow.appendChild(msgSpan);

        const metaRow = document.createElement("div");
        metaRow.style.fontSize = "0.85em";
        metaRow.style.opacity = "0.7";
        metaRow.style.display = "flex";
        metaRow.style.justifyContent = "space-between";

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
