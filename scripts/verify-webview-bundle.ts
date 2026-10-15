import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), "ui", "dist");
const entryPath = path.join(distDir, "index.js");
const maxEntryBytes = 100 * 1024;

if (!fs.existsSync(entryPath)) {
  throw new Error("Webview entrypoint is missing. Run the webview production build first.");
}

const entryBytes = fs.statSync(entryPath).size;
if (entryBytes > maxEntryBytes) {
  throw new Error(
    `Webview entrypoint is ${(entryBytes / 1024).toFixed(1)} KiB; expected at most ${maxEntryBytes / 1024} KiB. ` +
      "Check whether a lazy dependency was bundled into index.js.",
  );
}

const chunksDir = path.join(distDir, "chunks");
if (!fs.existsSync(chunksDir) || fs.readdirSync(chunksDir).length === 0) {
  throw new Error("Webview code splitting produced no chunks.");
}

console.log(`[Webview bundle] Entry verified at ${(entryBytes / 1024).toFixed(1)} KiB.`);
