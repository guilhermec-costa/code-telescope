import { type WebviewMessage } from "@shared/extension-webview-protocol";
import { escapeHtml } from "media-src/utils/html";
import { codeToHtml } from "shiki";

const vscode = acquireVsCodeApi();

let allOptions: string[] = [];
let filteredOptions: string[] = [];
let selectedIndex = 0;

const lastPreviewedData: LastPreviewedData = {
  option: null,
  content: null,
  language: null,
};

const listEl = document.getElementById("option-list") as HTMLUListElement;
const searchEl = document.getElementById("search") as HTMLInputElement;

window.addEventListener("DOMContentLoaded", () => {
  vscode.postMessage({ type: "ready" });
});

window.addEventListener("message", async (event) => {
  const msg = event.data as WebviewMessage;

  if (msg.type === "optionList") {
    allOptions = msg.data;
    filteredOptions = allOptions;
    updateFileCount(filteredOptions.length, allOptions.length);

    selectedIndex = filteredOptions.length - 1;
    renderList();

    const lastElement = filteredOptions.at(-1);
    if (lastElement) requestPreviewIfNeeded(lastElement);
  }

  if (msg.type === "previewUpdate") {
    const {
      data: { content, language, theme },
    } = msg;
    lastPreviewedData.content = content;
    await updatePreview(content, language, theme);
  }

  if (msg.type === "themeUpdate") {
    console.log("Theme updated on webview");
    await updatePanelTheme(msg.data.theme);
  }
});

async function updatePreview(content: string, language: string = "text", theme: string = "Default Dark+") {
  const previewEl = document.getElementById("preview");
  if (!previewEl) return;

  const html = await codeToHtml(content, {
    lang: language,
    theme: theme,
  });
  previewEl.innerHTML = html;
}

async function updatePanelTheme(theme: string) {
  const previewEl = document.getElementById("preview");
  console.log("Preview element");

  if (!previewEl || !lastPreviewedData.content || !lastPreviewedData.language) return;
  const html = await codeToHtml(lastPreviewedData.content, {
    lang: lastPreviewedData.language,
    theme: theme,
  });
  previewEl.innerHTML = html;
}

// ----------------------------
// Rendering
// ----------------------------
function renderList() {
  listEl.innerHTML = "";

  const query = searchEl.value.toLowerCase();

  filteredOptions.forEach((option, idx) => {
    const li = document.createElement("li");
    li.className = "option-item";
    if (idx === selectedIndex) li.classList.add("selected");

    li.innerHTML = highlightMatch(option, query);
    li.onclick = () => {
      selectedIndex = idx;
      openSelectedOption();
    };

    listEl.appendChild(li);
  });

  listEl.scrollTop = listEl.scrollHeight;
  scrollSelectedIntoView();
}

function highlightMatch(text: string, query: string) {
  if (!query) return escapeHtml(text);

  const i = text.toLowerCase().indexOf(query);
  if (i === -1) return escapeHtml(text);

  const before = escapeHtml(text.slice(0, i));
  const match = escapeHtml(text.slice(i, i + query.length));
  const after = escapeHtml(text.slice(i + query.length));

  return `${before}<span class="highlight">${match}</span>${after}`;
}

searchEl.addEventListener("input", () => {
  const query = searchEl.value.toLowerCase();
  filteredOptions = allOptions.filter((f) => f.toLowerCase().includes(query));
  updateFileCount(filteredOptions.length, allOptions.length);

  selectedIndex = filteredOptions.length - 1;
  renderList();

  const lastElement = filteredOptions.at(-1);
  if (lastElement) requestPreviewIfNeeded(lastElement);
});

document.addEventListener("keydown", (ev) => {
  if (ev.ctrlKey && ev.key === "j") {
    ev.preventDefault();
    ev.stopPropagation();
    moveSelection(1);
  }
  if (ev.ctrlKey && ev.key === "k") {
    ev.preventDefault();
    ev.stopPropagation();
    moveSelection(-1);
  }
  if (ev.key === "Enter") {
    ev.preventDefault();
    openSelectedOption();
  }
  if (ev.key == "Escape") {
    ev.preventDefault();
    closePanel();
  }
});

function moveSelection(dir: number) {
  if (!filteredOptions.length) return;

  selectedIndex = (selectedIndex + dir + filteredOptions.length) % filteredOptions.length;
  renderList();

  const option = filteredOptions[selectedIndex];
  requestPreviewIfNeeded(option);
}

function openSelectedOption() {
  vscode.postMessage({ type: "optionSelected", data: filteredOptions[selectedIndex] });
}

function closePanel() {
  vscode.postMessage({ type: "closePanel" });
}

function scrollSelectedIntoView() {
  const selected = listEl.querySelector(".selected");
  selected?.scrollIntoView({ block: "nearest" });
}

function requestPreviewIfNeeded(option: string) {
  if (lastPreviewedData.option !== option) {
    lastPreviewedData.option = option;
    vscode.postMessage({ type: "previewRequest", data: option });
  }
}

function updateFileCount(visibleCount: number, totalCount: number) {
  console.log(visibleCount, totalCount);
  const fileCountEl = document.getElementById("file-count");
  if (fileCountEl) {
    fileCountEl.textContent = `${visibleCount} / ${totalCount}`;
  }
}

declare function acquireVsCodeApi(): {
  postMessage(message: WebviewMessage): void;
  getState(): any;
  setState(state: any): void;
};

export interface LastPreviewedData {
  option: string | null;
  content: string | null;
  language: string | null;
}
