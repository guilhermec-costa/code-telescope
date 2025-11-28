import { escapeHtml } from "media-src/utils/html";

const vscode = acquireVsCodeApi();

let allOptions: string[] = [];
let filteredOptions: string[] = [];
let selectedIndex = 0;
let lastPreviewedOption: string | null = null;

const listEl = document.getElementById("option-list") as HTMLUListElement;
const searchEl = document.getElementById("search") as HTMLInputElement;

window.addEventListener("DOMContentLoaded", () => {
  vscode.postMessage({ type: "ready" });
  searchEl.focus();
});

window.addEventListener("message", (event) => {
  const msg = event.data as WebviewMessage;

  if (msg.type === "optionList") {
    allOptions = msg.data.relative;
    filteredOptions = allOptions;

    selectedIndex = filteredOptions.length - 1;
    renderList();

    const lastElement = filteredOptions.at(-1);
    if (lastElement) requestPreviewIfNeeded(lastElement);
  }

  if (msg.type === "previewUpdate") {
    const previewEl = document.getElementById("preview") as HTMLElement;
    previewEl.textContent = msg.data.content;
  }
});

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
  searchEl.blur();
}

function scrollSelectedIntoView() {
  const selected = listEl.querySelector(".selected");
  selected?.scrollIntoView({ block: "nearest" });
}

function requestPreviewIfNeeded(option: string) {
  if (lastPreviewedOption !== option) {
    lastPreviewedOption = option;
    vscode.postMessage({ type: "previewRequest", data: option });
  }
}
