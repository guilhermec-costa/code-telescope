/// <reference path="../../src/webview.d.ts" />

/** @type {ReturnType<typeof acquireVsCodeApi>} */
const vscode = acquireVsCodeApi();

let allOptions = [];
let filteredOptions = [];
let selectedIndex = 0;

const listEl = document.getElementById("file-list");
const searchEl = document.getElementById("search");

window.addEventListener("DOMContentLoaded", () => {
  vscode.postMessage({ type: "ready" });
});

window.addEventListener("message", (event) => {
  const { type, data } = event.data;

  if (type === "fileList") {
    allOptions = data;
    filteredOptions = allOptions;
    renderList();
  }
});

// ----------------------------
// Rendering
// ----------------------------
function renderList() {
  listEl.innerHTML = "";

  const query = searchEl.value.toLowerCase();

  filteredOptions.forEach((file, idx) => {
    const li = document.createElement("li");
    li.className = "file-item";
    if (idx === selectedIndex) li.classList.add("selected");

    li.innerHTML = highlightMatch(file, query);

    li.addEventListener("click", () => {
      selectedIndex = idx;
      openSelectedFile();
    });

    listEl.appendChild(li);
  });

  scrollSelectedIntoView();
}

/**
 * @param {string} text
 * @param {string} query
 */
function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);

  const i = text.toLowerCase().indexOf(query);
  if (i === -1) return escapeHtml(text);

  const before = escapeHtml(text.slice(0, i));
  const match = escapeHtml(text.slice(i, i + query.length));
  const after = escapeHtml(text.slice(i + query.length));

  return `${before}<span class="highlight">${match}</span>${after}`;
}

function escapeHtml(str) {
  return str.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

searchEl.addEventListener("input", () => {
  const query = searchEl.value.toLowerCase();

  filteredOptions = allOptions.filter((f) => f.toLowerCase().includes(query));
  selectedIndex = 0;
  renderList();
});

document.addEventListener("keydown", (ev) => {
  if (ev.ctrlKey && ev.key === "j") {
    ev.preventDefault();
    moveSelection(1);
  }
  if (ev.ctrlKey && ev.key === "k") {
    ev.preventDefault();
    moveSelection(-1);
  }
  if (ev.key === "Enter") {
    ev.preventDefault();
    openSelectedFile();
  }
});

function moveSelection(dir) {
  if (filteredOptions.length === 0) return;

  selectedIndex = (selectedIndex + dir + filteredOptions.length) % filteredOptions.length;
  renderList();
}

function openSelectedFile() {
  const file = filteredOptions[selectedIndex];
  vscode.postMessage({ type: "fileSelected", payload: file });
}

function scrollSelectedIntoView() {
  const selected = listEl.querySelector(".selected");
  if (selected) selected.scrollIntoView({ block: "nearest" });
}
