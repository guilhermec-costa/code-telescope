/// <reference path="../../src/webview.d.ts" />

/** @type {ReturnType<typeof acquireVsCodeApi>} */
const vscode = acquireVsCodeApi();

window.addEventListener("DOMContentLoaded", () => {
  vscode.postMessage({
    type: "ready",
  });
});

window.addEventListener("message", (event) => {
  const { type, data } = event.data;

  if (type === "fileList") {
    console.log("Received files:", data);
  }
});

console.log("Hello html from script!");
