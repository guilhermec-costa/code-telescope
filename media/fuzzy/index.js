/// <reference path="../../src/webview.d.ts" />

/** @type {ReturnType<typeof acquireVsCodeApi>} */
const vscode = acquireVsCodeApi();

/** @type{string[]} */
let allFilesPaths = [];

window.addEventListener("DOMContentLoaded", () => {
  vscode.postMessage({
    type: "ready",
  });
});

window.addEventListener("message", (event) => {
  const { type, data } = event.data;
  if (type === "fileList") {
    allFilesPaths = data;
    renderList(allFilesPaths);
  }
});

window.addEventListener("input", (event) => {
  if (event.target.id === "search") {
    const query = event.target.value.toLowerCase();
    const filtered = allFilesPaths.filter((path) => path.toLowerCase().includes(query));
    renderList(filtered);
  }
});

function renderList(files) {
  const ul = document.getElementById("file-list");
  if (!ul) return;

  ul.innerHTML = ""; // clears html
  for (const filePath of files) {
    const li = document.createElement("li");
    li.textContent = filePath;
    ul.appendChild(li);

    li.addEventListener("click", () => {
      vscode.postMessage({
        type: "fileSelected",
        payload: filePath,
      });
    });
  }
}
